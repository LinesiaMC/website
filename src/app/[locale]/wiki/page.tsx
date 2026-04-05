export const dynamic = "force-dynamic";

import { getWikiPages } from "@/lib/wiki";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import WikiContent from "./WikiContent";

export default async function WikiPage() {
  const pages = await getWikiPages();

  return (
    <main className="bg-white min-h-screen">
      <Navbar />
      <div className="pt-28 pb-20">
        <WikiContent pages={pages} />
      </div>
      <Footer />
    </main>
  );
}
