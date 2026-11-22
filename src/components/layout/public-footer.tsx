import Link from "next/link";
import { siteConfig } from "@/config/site";
import { Flame, Beer, MapPin, Phone, Mail, Clock } from "lucide-react";

export function PublicFooter() {
  return (
    <footer className="border-t border-asador-border/70 bg-asador-deep text-asador-silver pt-16 pb-12">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10">
          {/* Brand info */}
          <div className="md:col-span-2 space-y-4">
            <div className="flex items-center space-x-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-asador bg-gradient-to-br from-asador-ember to-asador-flame text-asador-parchment shadow-ember-glow">
                <Flame className="h-5 w-5" />
              </div>
              <span className="font-serif text-xl font-bold tracking-wider text-asador-parchment">
                {siteConfig.name}
              </span>
            </div>
            <p className="text-sm text-asador-silver max-w-md leading-relaxed">
              {siteConfig.description}
            </p>
            <div className="pt-2 flex items-center space-x-3 text-xs text-asador-ash">
              <span className="inline-flex items-center text-asador-malt">
                <Beer className="mr-1.5 h-3.5 w-3.5" /> Handcrafted Brews
              </span>
              <span>&bull;</span>
              <span className="inline-flex items-center text-asador-ember">
                <Flame className="mr-1.5 h-3.5 w-3.5" /> Wood-Fired Hearth
              </span>
              <span>&bull;</span>
              <span>Single-Restaurant Dedicated Platform</span>
            </div>
          </div>

          {/* Location & Hours */}
          <div className="space-y-3">
            <h4 className="font-serif text-base font-semibold text-asador-parchment tracking-wide">
              Location & Hours
            </h4>
            <div className="space-y-2 text-xs leading-relaxed">
              <p className="flex items-start space-x-2">
                <MapPin className="h-4 w-4 text-asador-copper shrink-0 mt-0.5" />
                <span>
                  {siteConfig.location.address}, {siteConfig.location.city},{" "}
                  {siteConfig.location.state} – {siteConfig.location.pincode}
                </span>
              </p>
              <p className="flex items-center space-x-2">
                <Clock className="h-4 w-4 text-asador-malt shrink-0" />
                <span>Weekdays: {siteConfig.hours.weekdays}</span>
              </p>
              <p className="flex items-center space-x-2 pl-6">
                <span>Weekends: {siteConfig.hours.weekends}</span>
              </p>
            </div>
          </div>

          {/* Contact & Links */}
          <div className="space-y-3">
            <h4 className="font-serif text-base font-semibold text-asador-parchment tracking-wide">
              Direct Contact
            </h4>
            <div className="space-y-2 text-xs">
              <p className="flex items-center space-x-2">
                <Phone className="h-4 w-4 text-asador-copper shrink-0" />
                <span>{siteConfig.contact.phone}</span>
              </p>
              <p className="flex items-center space-x-2">
                <Mail className="h-4 w-4 text-asador-copper shrink-0" />
                <span>{siteConfig.contact.email}</span>
              </p>
              <div className="pt-2">
                <Link
                  href="/admin"
                  className="inline-block text-xs text-asador-malt hover:underline"
                >
                  &rarr; Staff & Management Portal
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom copyright & architecture status */}
        <div className="mt-12 pt-8 border-t border-asador-borderMuted flex flex-col sm:flex-row items-center justify-between text-xs text-asador-ash space-y-4 sm:space-y-0">
          <p>
            &copy; {new Date().getFullYear()} {siteConfig.name}. All rights reserved.
          </p>
          <p className="text-[11px] text-asador-ash/80">
            Phase 1 Technical Foundation &bull; Independent Architecture
          </p>
        </div>
      </div>
    </footer>
  );
}
