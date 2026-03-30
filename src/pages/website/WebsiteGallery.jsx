import { getCompanySettings } from "@/pages/settings/CompanySettings";
import { useState, useEffect } from "react";

const GALLERY = [
  { url: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&q=80", caption: "New Asphalt Installation" },
  { url: "https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=800&q=80", caption: "Storm Damage Repair" },
  { url: "https://images.unsplash.com/photo-1621905251918-48416bd8575a?w=800&q=80", caption: "Roof Inspection" },
  { url: "https://images.unsplash.com/photo-1625219975831-a8060f8bb62c?w=800&q=80", caption: "Gutter Installation" },
  { url: "https://images.unsplash.com/photo-1600585154526-990dced4db0d?w=800&q=80", caption: "Exterior Siding" },
  { url: "https://images.unsplash.com/photo-1566792636543-96c00f3428dc?w=800&q=80", caption: "Commercial Flat Roof" },
  { url: "https://images.unsplash.com/photo-1632778149955-e80f8ceca2e8?w=800&q=80", caption: "Metal Roof Replacement" },
  { url: "https://images.unsplash.com/photo-1489171078254-c3365d6e359f?w=800&q=80", caption: "Ridge & Flashing Work" },
  { url: "https://images.unsplash.com/photo-1449157291145-7efd050a4d0e?w=800&q=80", caption: "New Build Installation" },
];

export default function WebsiteGallery() {
  const [co, setCo] = useState(getCompanySettings());
  const [lightbox, setLightbox] = useState(null);
  useEffect(() => {
    const handle = () => setCo(getCompanySettings());
    window.addEventListener("storage", handle);
    return () => window.removeEventListener("storage", handle);
  }, []);

  const primary = co.primaryColor || "#1e3a5f";

  return (
    <div>
      <div className="py-20 text-white text-center" style={{ background: primary }}>
        <h1 className="text-5xl font-extrabold mb-4">Our Work</h1>
        <p className="text-white/75 text-xl max-w-2xl mx-auto px-4">
          A selection of completed projects across residential and commercial properties.
        </p>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-16">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {GALLERY.map((img, i) => (
            <div
              key={i}
              className="relative group rounded-2xl overflow-hidden shadow-sm border cursor-pointer aspect-video"
              onClick={() => setLightbox(img)}
            >
              <img src={img.url} alt={img.caption} className="w-full h-full object-cover transition-transform group-hover:scale-105 duration-300" />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-end">
                <p className="text-white font-semibold text-sm px-4 py-3 opacity-0 group-hover:opacity-100 transition-opacity">
                  {img.caption}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Lightbox */}
      {lightbox && (
        <div
          className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
          onClick={() => setLightbox(null)}
        >
          <div className="max-w-4xl w-full" onClick={e => e.stopPropagation()}>
            <img src={lightbox.url} alt={lightbox.caption} className="w-full rounded-xl shadow-2xl" />
            <p className="text-white text-center mt-3 font-semibold">{lightbox.caption}</p>
          </div>
        </div>
      )}
    </div>
  );
}