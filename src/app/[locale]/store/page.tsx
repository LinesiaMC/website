import Navbar from "@/components/Navbar";
import Store from "@/components/Store";
import Footer from "@/components/Footer";

export default function StorePage() {
  return (
    <main>
      <Navbar />
      <div className="pt-24">
        <Store showAll />
      </div>
      <Footer />
    </main>
  );
}
