import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });

  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { job_id } = await req.json();
    if (!job_id) return Response.json({ error: 'job_id required' }, { status: 400 });

    // Fetch job and related data
    const jobs = await base44.asServiceRole.entities.Job.filter({ id: job_id });
    const job = jobs[0];
    if (!job) return Response.json({ error: 'Job not found' }, { status: 404 });

    const materials = await base44.asServiceRole.entities.Material.list();

    // Prepare data for LLM
    const roofAssessmentSummary = job.roof_condition ? `Roof Condition: ${job.roof_condition}, Age: ${job.roof_age_years} years, Area: ${job.roof_area_sq_ft} sq ft` : '';
    const damageInfo = job.damage_types?.length > 0 ? `Damage Types: ${job.damage_types.join(', ')}` : '';
    
    const jobSummary = `
Job Type: ${job.job_type}
Roof Type: ${job.roof_type}
Address: ${job.address}, ${job.city}, ${job.state} ${job.zip}
${roofAssessmentSummary}
${damageInfo}
Estimated Cost: $${job.estimated_cost || 'TBD'}
Plan of Action: ${job.plan_of_action || 'Not specified'}
    `.trim();

    // Call LLM for analysis
    const aiResponse = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: `You are a roofing expert. Based on this job information, provide a comprehensive roof report analysis:

${jobSummary}

Please provide:
1. Detailed analysis of the roof condition and issues
2. Recommended solution (specific approach and materials)
3. Estimated timeline for the work
4. Step-by-step action plan
5. Potential risks or considerations

Format your response clearly with sections.`,
      add_context_from_internet: false
    });

    const aiAnalysis = aiResponse;

    // Generate material recommendations
    const materialsResponse = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: `Based on this roof job, list the materials needed:

Job Type: ${job.job_type}
Roof Type: ${job.roof_type}
Area: ${job.roof_area_sq_ft} sq ft
Damage: ${job.damage_types?.join(', ') || 'N/A'}

Provide a JSON array with objects: {name, quantity, unit}. Only respond with the JSON array, nothing else.`,
      add_context_from_internet: false
    });

    let materialsNeeded = [];
    try {
      materialsNeeded = JSON.parse(materialsResponse);
      if (!Array.isArray(materialsNeeded)) materialsNeeded = [];
    } catch {
      materialsNeeded = [];
    }

    // Calculate estimated costs
    let totalMaterialCost = 0;
    const enrichedMaterials = materialsNeeded.map(mat => {
      const dbMaterial = materials.find(m => m.name.toLowerCase() === mat.name.toLowerCase());
      const unitPrice = dbMaterial?.unit_price || 50;
      const estimatedCost = (mat.quantity || 0) * unitPrice;
      totalMaterialCost += estimatedCost;
      return {
        ...mat,
        estimated_cost: estimatedCost
      };
    });

    const estimatedLaborCost = (job.roof_area_sq_ft || 0) * 15; // $15 per sq ft estimate
    const totalEstimatedCost = totalMaterialCost + estimatedLaborCost;

    // Create the roof report
    const report = await base44.asServiceRole.entities.RoofReport.create({
      job_id,
      job_customer_name: job.customer_name,
      status: 'draft',
      ai_analysis: aiAnalysis,
      recommended_solution: aiAnalysis.split('Recommended solution')[1]?.split('Estimated timeline')[0] || aiAnalysis,
      materials_needed: enrichedMaterials,
      estimated_labor_cost: estimatedLaborCost,
      estimated_material_cost: totalMaterialCost,
      total_estimated_cost: totalEstimatedCost,
      timeline_estimate: '5-7 business days',
      created_by: user.email
    });

    return Response.json({
      success: true,
      report_id: report.id,
      report
    });
  } catch (error) {
    console.error('generateRoofReport error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});