import { Facebook, Instagram, Linkedin, Youtube } from "lucide-react";
import remaxLogo from "@/assets/remax-excellence-logo.png";

const social = [
  { icon: Facebook, href: "https://www.facebook.com", label: "Facebook" },
  { icon: Instagram, href: "https://www.instagram.com", label: "Instagram" },
  { icon: Linkedin, href: "https://www.linkedin.com", label: "LinkedIn" },
  { icon: Youtube, href: "https://www.youtube.com", label: "YouTube" },
];

export default function PortalFooter() {
  return (
    <footer className="border-t border-border bg-[#1a1f36] text-primary-foreground mt-16">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">
          <div className="space-y-4">
            <img src={remaxLogo} alt="REMAX Excellence Canada" className="h-10 w-auto brightness-0 invert opacity-95" />
            <p className="text-sm text-primary-foreground/75 leading-relaxed">
              REMAX Excellence Canada — Agent Portal. Tools, training, and support for licensed professionals.
            </p>
            <div className="flex gap-3">
              {social.map(({ icon: Icon, href, label }) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-full bg-primary-foreground/10 p-2 hover:bg-primary-foreground/20 transition-colors"
                  aria-label={label}
                >
                  <Icon className="h-4 w-4" />
                </a>
              ))}
            </div>
          </div>

          <div>
            <h3 className="font-display font-semibold text-lg mb-4">Quick links</h3>
            <ul className="space-y-2 text-sm text-primary-foreground/80">
              <li>
                <a href="#" className="hover:underline">
                  Privacy Policy
                </a>
              </li>
              <li>
                <a href="#" className="hover:underline">
                  Terms of Use
                </a>
              </li>
              <li>
                <a href="#support" className="hover:underline">
                  Contact Us
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="font-display font-semibold text-lg mb-4">Mississauga</h3>
            <p className="text-sm text-primary-foreground/80 leading-relaxed">
              102-115 Matheson Blvd W
              <br />
              Mississauga, ON L5R 3L1
              <br />
              <a href="tel:+19055074436" className="text-accent hover:underline">
                (905) 507-4436
              </a>
            </p>
          </div>

          <div>
            <h3 className="font-display font-semibold text-lg mb-4">Brampton</h3>
            <p className="text-sm text-primary-foreground/80 leading-relaxed">
              456 Vodden St E #21b
              <br />
              Brampton, ON L6S 5Y7
              <br />
              <a href="tel:+15193421961" className="text-accent hover:underline">
                519-342-1961
              </a>
            </p>
          </div>
        </div>

        <div className="mt-10 flex flex-col gap-4 border-t border-primary-foreground/15 pt-8 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-center text-xs text-primary-foreground/60 sm:text-left">
            © {new Date().getFullYear()} REMAX Excellence Canada. All rights reserved.
          </p>
          <div className="flex flex-wrap justify-center gap-4 text-xs text-primary-foreground/50">
            <a href="#" className="hover:text-primary-foreground/80">
              Privacy Policy
            </a>
            <a href="#" className="hover:text-primary-foreground/80">
              Terms of Use
            </a>
            <a href="#support" className="hover:text-primary-foreground/80">
              Contact Us
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
