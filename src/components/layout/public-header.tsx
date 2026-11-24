"use client";

import * as React from "react";
import Link from "next/link";
import { siteConfig } from "@/config/site";
import { Button } from "@/components/ui/button";
import { Flame, Beer, Menu, X, ShieldCheck } from "lucide-react";

export function PublicHeader() {
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-[#E5DEC9] bg-[#FAF7F2]/90 backdrop-blur-md shadow-[0_4px_20px_-4px_rgba(30,25,22,0.06)]">
      <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Brand logo & title */}
        <Link href="/" className="flex items-center space-x-3 group">
          <div className="flex h-11 w-11 items-center justify-center rounded-asador-lg bg-gradient-to-br from-asador-ember to-asador-flame text-asador-ivory shadow-ember-glow transition-transform group-hover:scale-105">
            <Flame className="h-6 w-6" />
          </div>
          <div className="flex flex-col">
            <span className="font-serif text-xl font-bold tracking-wider text-asador-parchment">
              L&apos;ASADOR
            </span>
            <span className="text-[10px] uppercase tracking-widest text-asador-malt font-medium">
              Grill & Brew &bull; Mohali
            </span>
          </div>
        </Link>

        {/* Desktop Navigation Links */}
        <nav className="hidden md:flex items-center space-x-8 text-sm font-medium">
          <Link
            href="/"
            className="text-asador-parchment transition-colors hover:text-asador-ember"
          >
            Home
          </Link>
          <Link
            href="#concept"
            className="text-asador-silver transition-colors hover:text-asador-ember"
          >
            The Concept
          </Link>
          <Link
            href="#craft-taps"
            className="text-asador-silver transition-colors hover:text-asador-malt flex items-center space-x-1.5"
          >
            <Beer className="h-4 w-4 text-asador-malt" />
            <span>Craft Taps</span>
          </Link>
          <Link
            href="#grill"
            className="text-asador-silver transition-colors hover:text-asador-ember"
          >
            Wood-Fired Grill
          </Link>
        </nav>

        {/* Action Button: Admin Preview */}
        <div className="hidden md:flex items-center space-x-4">
          <Link href="/admin">
            <Button variant="outline" size="sm" className="border-asador-copper/40 hover:border-asador-copper">
              <ShieldCheck className="mr-2 h-4 w-4 text-asador-copper" />
              Admin Portal
            </Button>
          </Link>
        </div>

        {/* Mobile menu button */}
        <div className="md:hidden flex items-center">
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="min-h-11 min-w-11 flex items-center justify-center p-2 rounded-asador text-asador-silver hover:text-asador-parchment hover:bg-asador-surface"
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? (
              <X className="h-6 w-6" />
            ) : (
              <Menu className="h-6 w-6" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden border-b border-asador-border bg-asador-surface px-4 py-6 space-y-4">
          <nav className="flex flex-col space-y-3 text-base font-medium">
            <Link
              href="/"
              onClick={() => setMobileMenuOpen(false)}
              className="py-2 text-asador-parchment hover:text-asador-ember transition-colors"
            >
              Home
            </Link>
            <Link
              href="#concept"
              onClick={() => setMobileMenuOpen(false)}
              className="py-2 text-asador-silver hover:text-asador-ember transition-colors"
            >
              The Concept
            </Link>
            <Link
              href="#craft-taps"
              onClick={() => setMobileMenuOpen(false)}
              className="py-2 text-asador-silver hover:text-asador-malt flex items-center space-x-2 transition-colors"
            >
              <Beer className="h-4 w-4 text-asador-malt" />
              <span>Craft Taps</span>
            </Link>
            <Link
              href="#grill"
              onClick={() => setMobileMenuOpen(false)}
              className="py-2 text-asador-silver hover:text-asador-ember transition-colors"
            >
              Wood-Fired Grill
            </Link>
            <div className="pt-2">
              <Link href="/admin" onClick={() => setMobileMenuOpen(false)}>
                <Button variant="copper" className="w-full min-h-11 h-11 text-xs font-semibold">
                  <ShieldCheck className="mr-2 h-4 w-4" />
                  Access Admin Portal
                </Button>
              </Link>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
