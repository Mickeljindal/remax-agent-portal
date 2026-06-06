import { Compass } from "lucide-react";
import EditableHeading from "@/components/dashboard/EditableHeading";
import VastuTool from "./VastuTool";

interface VastuSectionProps {
  isAdmin: boolean;
}

/**
 * Dashboard section that hosts the interactive Vastu Chakra floor-plan tool.
 * Heading is admin-editable via the section labels system (key: "vastu").
 */
export default function VastuSection({ isAdmin }: VastuSectionProps) {
  return (
    <div>
      <div className="mb-5 flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-[#e2231a] to-[#1a4d8f] shadow-sm">
          <Compass className="h-6 w-6 text-white" />
        </div>
        <EditableHeading
          sectionKey="vastu"
          defaultTitle="Vastu Chakra"
          defaultSubtitle="Overlay the Vastu compass on a client's floor plan and explain each zone"
          isAdmin={isAdmin}
        >
          {(lbl) => (
            <div>
              <h2 className="font-display text-2xl font-bold text-foreground">{lbl.title}</h2>
              <p className="text-sm text-muted-foreground">{lbl.subtitle}</p>
            </div>
          )}
        </EditableHeading>
      </div>
      <VastuTool />
    </div>
  );
}
