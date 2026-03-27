import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import PageHeader from "@/components/shared/PageHeader";
import { PlusCircle, Search, Pencil, Trash2, Package, Tag } from "lucide-react";
import { toast } from "sonner";
import MaterialFormDialog from "./MaterialFormDialog";
import CategoryManager from "./CategoryManager";
import { cn } from "@/lib/utils";

const UNIT_LABELS = {
  each: "Each", sq_ft: "Sq Ft", bundle: "Bundle", roll: "Roll",
  gallon: "Gallon", box: "Box", sheet: "Sheet", linear_ft: "Linear Ft",
  square: "Square", bag: "Bag", tube: "Tube"
};

export default function Materials() {
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");
  const [materialDialog, setMaterialDialog] = useState(null); // null | "new" | material obj
  const [showCategories, setShowCategories] = useState(false);
  const queryClient = useQueryClient();

  const { data: materials = [], isLoading } = useQuery({
    queryKey: ["materials"],
    queryFn: () => base44.entities.Material.list("name", 500),
  });

  const { data: categories = [] } = useQuery({
    queryKey: ["material-categories"],
    queryFn: () => base44.entities.MaterialCategory.list("name"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Material.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["materials"] });
      toast.success("Material deleted");
    },
  });

  const filtered = materials.filter(m => {
    const matchSearch = !search || m.name?.toLowerCase().includes(search.toLowerCase()) || m.sku?.toLowerCase().includes(search.toLowerCase());
    const matchCat = activeCategory === "all" || m.category_id === activeCategory;
    return matchSearch && matchCat;
  });

  if (isLoading) {
    return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" /></div>;
  }

  return (
    <div>
      <PageHeader title="Materials" subtitle={`${materials.length} items in catalog`}>
        <Button variant="outline" onClick={() => setShowCategories(true)}>
          <Tag className="w-4 h-4 mr-2" /> Categories
        </Button>
        <Button onClick={() => setMaterialDialog("new")}>
          <PlusCircle className="w-4 h-4 mr-2" /> Add Material
        </Button>
      </PageHeader>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search materials or SKU..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
        </div>
        <Tabs value={activeCategory} onValueChange={setActiveCategory}>
          <TabsList className="flex-wrap h-auto">
            <TabsTrigger value="all">All</TabsTrigger>
            {categories.map(c => (
              <TabsTrigger key={c.id} value={c.id}>{c.name}</TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>

      {/* Materials grid */}
      {filtered.length === 0 ? (
        <Card>
          <CardContent className="text-center py-16">
            <Package className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">No materials found</p>
            <Button className="mt-4" variant="outline" onClick={() => setMaterialDialog("new")}>Add First Material</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map(mat => (
            <Card key={mat.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm truncate">{mat.name}</p>
                    {mat.category_name && (
                      <Badge variant="secondary" className="text-xs mt-1">{mat.category_name}</Badge>
                    )}
                  </div>
                  <div className="flex gap-1 flex-shrink-0 ml-2">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setMaterialDialog(mat)}>
                      <Pencil className="w-3 h-3" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => deleteMutation.mutate(mat.id)}>
                      <Trash2 className="w-3 h-3 text-destructive" />
                    </Button>
                  </div>
                </div>
                {mat.description && <p className="text-xs text-muted-foreground mb-2 line-clamp-2">{mat.description}</p>}
                <div className="border-t pt-2 mt-2 space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Unit</span>
                    <span className="font-medium">{UNIT_LABELS[mat.unit] || mat.unit}</span>
                  </div>
                  {mat.unit_cost != null && (
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Your Cost</span>
                      <span>${Number(mat.unit_cost).toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Sell Price</span>
                    <span className="font-semibold text-primary">${Number(mat.unit_price).toFixed(2)}</span>
                  </div>
                  {mat.sku && (
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">SKU</span>
                      <span className="font-mono">{mat.sku}</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <MaterialFormDialog
        open={!!materialDialog}
        onClose={() => setMaterialDialog(null)}
        existing={materialDialog !== "new" ? materialDialog : null}
        categories={categories}
      />

      <CategoryManager
        open={showCategories}
        onClose={() => setShowCategories(false)}
      />
    </div>
  );
}