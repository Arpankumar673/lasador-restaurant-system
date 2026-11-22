import Link from "next/link";
import { siteConfig } from "@/config/site";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Container } from "@/components/ui/container";
import {
  Flame,
  Beer,
  UtensilsCrossed,
  ShieldCheck,
  MapPin,
  Clock,
  Sparkles,
  Server,
  Layers,
  ArrowRight,
} from "lucide-react";

export default function HomePage() {
  return (
    <div className="flex flex-col">
      {/* =========================================================================
          HERO SECTION: L'ASADOR IDENTITY
          ========================================================================= */}
      <section className="relative overflow-hidden border-b border-asador-border/60 py-24 sm:py-32 bg-grill-pattern">
        {/* Glow backdrop */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-asador-ember/10 blur-[120px] rounded-full pointer-events-none" />

        <Container size="xl" className="relative z-10 text-center">
          <div className="mx-auto flex max-w-3xl flex-col items-center space-y-6">
            <div className="inline-flex items-center space-x-2 rounded-full border border-asador-copper/40 bg-asador-surface/80 px-3.5 py-1 text-xs text-asador-copper">
              <Sparkles className="h-3.5 w-3.5 text-asador-malt" />
              <span className="font-medium tracking-wide">
                Artisanal Wood-Fired Grill & Craft Microbrewery &bull; Mohali
              </span>
            </div>

            <h1 className="font-serif text-4xl sm:text-6xl md:text-7xl font-bold tracking-tight text-asador-parchment leading-tight">
              L&apos;ASADOR
              <span className="block text-2xl sm:text-3xl md:text-4xl font-normal text-asador-malt mt-2 font-serif tracking-widest">
                GRILL & BREW
              </span>
            </h1>

            <p className="text-base sm:text-lg text-asador-silver max-w-2xl leading-relaxed">
              Prime wood-fired cuts grilled over open charcoal embers, paired with
              handcrafted small-batch craft beers brewed in-house. A dedicated culinary
              destination in Mohali, Punjab.
            </p>

            {/* Badges / Callouts */}
            <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
              <Badge variant="default">
                <Flame className="mr-1.5 h-3.5 w-3.5" /> Charcoal & Wood Fire
              </Badge>
              <Badge variant="malt">
                <Beer className="mr-1.5 h-3.5 w-3.5" /> In-House Microbrewery
              </Badge>
              <Badge variant="copper">
                <MapPin className="mr-1.5 h-3.5 w-3.5" /> Sector 82, Mohali
              </Badge>
              <Badge variant="hops">
                <ShieldCheck className="mr-1.5 h-3.5 w-3.5" /> Dedicated System
              </Badge>
            </div>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4 w-full sm:w-auto">
              <Link href="#concept">
                <Button variant="default" size="lg" className="w-full sm:w-auto">
                  Explore The Concept
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
              <Link href="/admin">
                <Button variant="outline" size="lg" className="w-full sm:w-auto">
                  <ShieldCheck className="mr-2 h-4 w-4 text-asador-copper" />
                  Staff & Admin Console
                </Button>
              </Link>
            </div>
          </div>
        </Container>
      </section>

      {/* =========================================================================
          THE CONCEPT: GRILL & BREW PHILOSOPHY
          ========================================================================= */}
      <section id="concept" className="py-20 sm:py-28 border-b border-asador-border/60 bg-asador-deep/40">
        <Container size="xl">
          <div className="text-center max-w-2xl mx-auto mb-16 space-y-3">
            <span className="text-xs uppercase tracking-widest text-asador-ember font-semibold">
              The Culinary Philosophy
            </span>
            <h2 className="font-serif text-3xl sm:text-4xl font-bold text-asador-parchment">
              Fire, Smoke & Golden Malt
            </h2>
            <p className="text-sm sm:text-base text-asador-silver leading-relaxed">
              Every dish is kissed by natural hardwood embers, and every brew is crafted
              with patience, precision, and passion.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* The Asador Hearth */}
            <Card glow="ember" className="relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-6 text-asador-ember/10 group-hover:text-asador-ember/20 transition-colors">
                <Flame className="w-32 h-32 -mr-10 -mt-10" />
              </div>
              <CardHeader>
                <div className="flex items-center space-x-3 mb-2">
                  <div className="p-2.5 rounded-asador bg-asador-ember/20 text-asador-ember">
                    <Flame className="h-6 w-6" />
                  </div>
                  <Badge variant="default">Wood-Fired Hearth</Badge>
                </div>
                <CardTitle className="text-2xl">The Asador Grill</CardTitle>
                <CardDescription>
                  Authentic Argentine & Mediterranean live fire grilling techniques
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-asador-silver leading-relaxed">
                <p>
                  At L&apos;Asador, our hearth burns seasoned oak, hickory, and fruitwood.
                  Slow heat circulation renders succulent cuts to buttery tenderness,
                  while searing flame grates deliver the unmistakable smoky crust that
                  defines true asador dining.
                </p>
                <ul className="space-y-1.5 text-xs text-asador-parchment pt-2">
                  <li className="flex items-center space-x-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-asador-ember" />
                    <span>Dry-aged prime steaks, tenderized over hickory coals</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-asador-ember" />
                    <span>Artisanal smoked sausages, chorizo & charred platters</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-asador-ember" />
                    <span>Caramelized fire-roasted seasonal vegetables & chimichurri</span>
                  </li>
                </ul>
              </CardContent>
            </Card>

            {/* The Microbrewery */}
            <Card glow="malt" className="relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-6 text-asador-malt/10 group-hover:text-asador-malt/20 transition-colors">
                <Beer className="w-32 h-32 -mr-10 -mt-10" />
              </div>
              <CardHeader>
                <div className="flex items-center space-x-3 mb-2">
                  <div className="p-2.5 rounded-asador bg-asador-malt/20 text-asador-malt">
                    <Beer className="h-6 w-6" />
                  </div>
                  <Badge variant="malt">Microbrewery</Badge>
                </div>
                <CardTitle className="text-2xl">Craft Microbrewery</CardTitle>
                <CardDescription>
                  Small-batch lagers, ales, and stouts brewed directly in Mohali
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-asador-silver leading-relaxed">
                <p>
                  Copper fermentation tanks and German brewing pedigree form the core of
                  our beer program. Unfiltered, unpasteurized, and served fresh from
                  temperature-controlled cold taps straight to your glass.
                </p>
                <ul className="space-y-1.5 text-xs text-asador-parchment pt-2">
                  <li className="flex items-center space-x-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-asador-malt" />
                    <span>Belgian Witbier with coriander seed & orange peel</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-asador-malt" />
                    <span>Smoked Amber Ale paired to cut through rich grilled meats</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-asador-malt" />
                    <span>Crisp Czech-style Pilsner with noble Saaz hops</span>
                  </li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </Container>
      </section>

      {/* =========================================================================
          CRAFT TAPS & SPECIALTIES PREVIEW
          ========================================================================= */}
      <section id="craft-taps" className="py-20 sm:py-28 border-b border-asador-border/60">
        <Container size="xl">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-4">
            <div>
              <span className="text-xs uppercase tracking-widest text-asador-copper font-semibold">
                On Tap & Grill
              </span>
              <h2 className="font-serif text-3xl font-bold text-asador-parchment mt-1">
                Signature House Specialties
              </h2>
            </div>
            <p className="text-sm text-asador-silver max-w-md">
              Freshly tapped craft brews and signature kitchen creations developed
              exclusively for L&apos;Asador guests in Mohali.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card glow="copper">
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <CardTitle className="text-lg">Asador Smoked Porter</CardTitle>
                  <span className="text-xs font-semibold text-asador-malt">6.2% ABV</span>
                </div>
                <CardDescription>Bar Tap 01 &bull; Dark Malts & Beechwood Smoke</CardDescription>
              </CardHeader>
              <CardContent className="text-xs text-asador-silver leading-relaxed">
                Brewed with malted barley smoked over German beechwood. Robust chocolate,
                espresso notes, and a velvety smooth head.
              </CardContent>
            </Card>

            <Card glow="copper">
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <CardTitle className="text-lg">Mohali Sunset Witbier</CardTitle>
                  <span className="text-xs font-semibold text-asador-malt">4.8% ABV</span>
                </div>
                <CardDescription>Bar Tap 02 &bull; Wheat, Orange & Spice</CardDescription>
              </CardHeader>
              <CardContent className="text-xs text-asador-silver leading-relaxed">
                A refreshing wheat beer infused with organic sweet orange peel and crushed
                coriander. Unfiltered, cloudy, and crisp.
              </CardContent>
            </Card>

            <Card glow="copper">
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <CardTitle className="text-lg">Pine & Ember IPA</CardTitle>
                  <span className="text-xs font-semibold text-asador-malt">6.8% ABV</span>
                </div>
                <CardDescription>Bar Tap 03 &bull; Citra & Mosaic Hops</CardDescription>
              </CardHeader>
              <CardContent className="text-xs text-asador-silver leading-relaxed">
                Bursting with grapefruit, resinous pine, and tropical aromas. Balanced
                bitterness designed to complement smoky barbecues.
              </CardContent>
            </Card>

            <Card glow="ember" id="grill">
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <CardTitle className="text-lg">Wood-Fired Ribeye Cut</CardTitle>
                  <Badge variant="default" className="text-[10px]">Grill Hearth</Badge>
                </div>
                <CardDescription>Prime 350g &bull; Hickory Wood Smoked</CardDescription>
              </CardHeader>
              <CardContent className="text-xs text-asador-silver leading-relaxed">
                Marinated with coarse sea salt and cracked peppercorn. Seared over 400°C
                open embers with garlic-herb bone marrow butter.
              </CardContent>
            </Card>

            <Card glow="ember">
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <CardTitle className="text-lg">Glazed Pork Belly Bites</CardTitle>
                  <Badge variant="default" className="text-[10px]">Slow Smoke</Badge>
                </div>
                <CardDescription>Craft Beer & Jaggery Reduction</CardDescription>
              </CardHeader>
              <CardContent className="text-xs text-asador-silver leading-relaxed">
                Slow-braised for 6 hours, crisped on the grill, and glazed with our house
                amber ale, ginger, and wild mountain honeycomb.
              </CardContent>
            </Card>

            <Card glow="ember">
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <CardTitle className="text-lg">Smoked Burrata & Peaches</CardTitle>
                  <Badge variant="malt" className="text-[10px]">Pantry Hearth</Badge>
                </div>
                <CardDescription>Charred Fruit & Wild Arugula</CardDescription>
              </CardHeader>
              <CardContent className="text-xs text-asador-silver leading-relaxed">
                Lightly cold-smoked burrata, wood-charred seasonal peaches, toasted pine
                nuts, aged Modena balsamic, and artisan sourdough.
              </CardContent>
            </Card>
          </div>
        </Container>
      </section>

      {/* =========================================================================
          TECHNICAL FOUNDATION & INDEPENDENCE OVERVIEW
          ========================================================================= */}
      <section className="py-20 border-b border-asador-border/60 bg-asador-deep/80">
        <Container size="xl">
          <div className="rounded-asador-xl border border-asador-border bg-asador-surface p-8 sm:p-12">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="space-y-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-asador bg-asador-ember/20 text-asador-ember">
                  <Server className="h-5 w-5" />
                </div>
                <h3 className="font-serif text-lg font-bold text-asador-parchment">
                  Dedicated Supabase
                </h3>
                <p className="text-xs text-asador-silver leading-relaxed">
                  Engineered with an independent PostgreSQL database and auth project.
                  Zero shared credentials, zero shared tables.
                </p>
              </div>

              <div className="space-y-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-asador bg-asador-copper/20 text-asador-copper">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <h3 className="font-serif text-lg font-bold text-asador-parchment">
                  Single-Restaurant Focus
                </h3>
                <p className="text-xs text-asador-silver leading-relaxed">
                  Tailored specifically to L&apos;Asador&apos;s operational flow. No
                  multi-tenant complexity, tenant IDs, or SaaS bloat.
                </p>
              </div>

              <div className="space-y-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-asador bg-asador-malt/20 text-asador-malt">
                  <Layers className="h-5 w-5" />
                </div>
                <h3 className="font-serif text-lg font-bold text-asador-parchment">
                  Station Routing Ready
                </h3>
                <p className="text-xs text-asador-silver leading-relaxed">
                  Architecture prepared to route beverage items to Bar Taps and meat/grill
                  items directly to Kitchen Display boards.
                </p>
              </div>
            </div>
          </div>
        </Container>
      </section>
    </div>
  );
}
