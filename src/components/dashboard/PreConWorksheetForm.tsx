import { useMemo, useState } from "react";
import { callServerApi } from "@/lib/serverApi";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { Loader2, Upload } from "lucide-react";

type PurchaserForm = {
  firstName: string;
  lastName: string;
  dob: string;
  sin: string;
  drivingLicense: string;
  expDate: string;
  address: string;
  telephone: string;
  cell: string;
  email: string;
  employerOccupation: string;
};

interface PreConWorksheetFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  agentId?: string;
  agentName?: string | null;
  agentEmail?: string | null;
  recoNumber?: string | null;
}

const emptyPurchaser = (): PurchaserForm => ({
  firstName: "",
  lastName: "",
  dob: "",
  sin: "",
  drivingLicense: "",
  expDate: "",
  address: "",
  telephone: "",
  cell: "",
  email: "",
  employerOccupation: "",
});

async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result || "");
      const commaIndex = result.indexOf(",");
      resolve(commaIndex >= 0 ? result.slice(commaIndex + 1) : result);
    };
    reader.onerror = () => reject(new Error("Could not read attachment file."));
    reader.readAsDataURL(file);
  });
}

export default function PreConWorksheetForm({
  open,
  onOpenChange,
  agentId,
  agentName,
  agentEmail,
  recoNumber,
}: PreConWorksheetFormProps) {
  const [projectName, setProjectName] = useState("");
  const [modelName, setModelName] = useState("");
  const [floorType, setFloorType] = useState("");
  const [directionExposure, setDirectionExposure] = useState("");
  const [choice1, setChoice1] = useState("");
  const [choice2, setChoice2] = useState("");
  const [choice3, setChoice3] = useState("");
  const [choice4, setChoice4] = useState("");
  const [needParking, setNeedParking] = useState("no");
  const [needLocker, setNeedLocker] = useState("no");
  const [date, setDate] = useState("");
  const [additionalComments, setAdditionalComments] = useState("");
  const [brokerageName, setBrokerageName] = useState("RE/MAX Excellence Realty Inc.");
  const [officePhone, setOfficePhone] = useState("");
  const [agentCellPhone, setAgentCellPhone] = useState("");
  const [purchaser1, setPurchaser1] = useState<PurchaserForm>(emptyPurchaser());
  const [purchaser2, setPurchaser2] = useState<PurchaserForm>(emptyPurchaser());
  const [idAttachment, setIdAttachment] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const canSubmit = useMemo(() => {
    return (
      !!projectName.trim() &&
      !!brokerageName.trim() &&
      !!purchaser1.firstName.trim() &&
      !!purchaser1.lastName.trim() &&
      !!purchaser1.email.trim() &&
      !!idAttachment
    );
  }, [projectName, brokerageName, purchaser1, idAttachment]);

  const onFileChange = (file: File | null) => {
    if (!file) {
      setIdAttachment(null);
      return;
    }
    const allowed = ["image/jpeg", "image/png"];
    if (!allowed.includes(file.type)) {
      toast({
        variant: "destructive",
        title: "Invalid file type",
        description: "Only JPG or PNG files are allowed for client ID upload.",
      });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast({
        variant: "destructive",
        title: "File too large",
        description: "Please upload an image under 5MB.",
      });
      return;
    }
    setIdAttachment(file);
  };

  const submitWorksheet = async () => {
    if (!canSubmit || !idAttachment) {
      toast({
        variant: "destructive",
        title: "Required fields missing",
        description: "Please complete required fields and attach client ID (JPG/PNG).",
      });
      return;
    }

    setSubmitting(true);
    try {
      const contentBase64 = await fileToBase64(idAttachment);

      const { error } = await callServerApi("submit-precon-worksheet", {
        projectName,
        modelName,
        floorType,
        directionExposure,
        choices: [choice1, choice2, choice3, choice4].filter(Boolean),
        needParking: needParking === "yes",
        needLocker: needLocker === "yes",
        date,
        additionalComments,
        cooperatingBroker: {
          brokerageName,
          agentName: agentName || "",
          agentEmail: agentEmail || "",
          officePhone,
          cellPhone: agentCellPhone,
          recoNumber: recoNumber || "",
        },
        purchasers: [purchaser1, purchaser2],
        idAttachment: {
          filename: idAttachment.name,
          mimeType: idAttachment.type,
          contentBase64,
        },
        metadata: {
          agentId: agentId || null,
        },
      });

      if (error) throw new Error(error);

      toast({
        title: "Worksheet submitted",
        description: "Sent to admin and to your email with the ID attachment.",
      });
      onOpenChange(false);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Could not submit worksheet.";
      toast({ variant: "destructive", title: "Submission failed", description: message });
    } finally {
      setSubmitting(false);
    }
  };

  const purchaserField = (
    title: string,
    purchaser: PurchaserForm,
    setPurchaser: (next: PurchaserForm) => void,
  ) => (
    <div className="rounded-xl border border-border/80 bg-muted/20 p-3">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</p>
      <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
        <Input placeholder="First name" value={purchaser.firstName} onChange={(e) => setPurchaser({ ...purchaser, firstName: e.target.value })} />
        <Input placeholder="Last name" value={purchaser.lastName} onChange={(e) => setPurchaser({ ...purchaser, lastName: e.target.value })} />
        <Input placeholder="Date of birth" value={purchaser.dob} onChange={(e) => setPurchaser({ ...purchaser, dob: e.target.value })} />
        <Input placeholder="SIN" value={purchaser.sin} onChange={(e) => setPurchaser({ ...purchaser, sin: e.target.value })} />
        <Input placeholder="Driving license #" value={purchaser.drivingLicense} onChange={(e) => setPurchaser({ ...purchaser, drivingLicense: e.target.value })} />
        <Input placeholder="License exp date" value={purchaser.expDate} onChange={(e) => setPurchaser({ ...purchaser, expDate: e.target.value })} />
        <Input placeholder="Telephone" value={purchaser.telephone} onChange={(e) => setPurchaser({ ...purchaser, telephone: e.target.value })} />
        <Input placeholder="Cell phone" value={purchaser.cell} onChange={(e) => setPurchaser({ ...purchaser, cell: e.target.value })} />
        <Input placeholder="Email" value={purchaser.email} onChange={(e) => setPurchaser({ ...purchaser, email: e.target.value })} />
        <Input placeholder="Employer / Occupation" value={purchaser.employerOccupation} onChange={(e) => setPurchaser({ ...purchaser, employerOccupation: e.target.value })} />
      </div>
      <Textarea
        className="mt-2"
        rows={2}
        placeholder="Address"
        value={purchaser.address}
        onChange={(e) => setPurchaser({ ...purchaser, address: e.target.value })}
      />
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] max-w-4xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">Pre-Con Worksheet Submission</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-1">
          <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
            <div>
              <Label>Project name *</Label>
              <Input value={projectName} onChange={(e) => setProjectName(e.target.value)} />
            </div>
            <div>
              <Label>Model name</Label>
              <Input value={modelName} onChange={(e) => setModelName(e.target.value)} />
            </div>
            <div>
              <Label>Floor type</Label>
              <Input value={floorType} onChange={(e) => setFloorType(e.target.value)} />
            </div>
          </div>

          <div className="rounded-xl border border-border/80 bg-muted/20 p-3">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Co-operating broker details
            </p>
            <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
              <Input placeholder="Brokerage name *" value={brokerageName} onChange={(e) => setBrokerageName(e.target.value)} />
              <Input placeholder="Agent name" value={agentName || ""} readOnly />
              <Input placeholder="Agent email" value={agentEmail || ""} readOnly />
              <Input placeholder="RECO number" value={recoNumber || ""} readOnly />
              <Input placeholder="Office phone" value={officePhone} onChange={(e) => setOfficePhone(e.target.value)} />
              <Input placeholder="Cell phone" value={agentCellPhone} onChange={(e) => setAgentCellPhone(e.target.value)} />
            </div>
          </div>

          {purchaserField("Purchaser 1", purchaser1, setPurchaser1)}
          {purchaserField("Purchaser 2 (optional)", purchaser2, setPurchaser2)}

          <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
            <div>
              <Label>Direction / exposure</Label>
              <Input value={directionExposure} onChange={(e) => setDirectionExposure(e.target.value)} />
            </div>
            <div>
              <Label>Need parking</Label>
              <Input value={needParking} onChange={(e) => setNeedParking(e.target.value.toLowerCase() === "yes" ? "yes" : "no")} placeholder="yes / no" />
            </div>
            <div>
              <Label>Need locker</Label>
              <Input value={needLocker} onChange={(e) => setNeedLocker(e.target.value.toLowerCase() === "yes" ? "yes" : "no")} placeholder="yes / no" />
            </div>
            <Input placeholder="Choice #1" value={choice1} onChange={(e) => setChoice1(e.target.value)} />
            <Input placeholder="Choice #2" value={choice2} onChange={(e) => setChoice2(e.target.value)} />
            <Input placeholder="Choice #3" value={choice3} onChange={(e) => setChoice3(e.target.value)} />
            <Input placeholder="Choice #4" value={choice4} onChange={(e) => setChoice4(e.target.value)} />
            <Input placeholder="Date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>

          <div>
            <Label>Additional comments</Label>
            <Textarea rows={3} value={additionalComments} onChange={(e) => setAdditionalComments(e.target.value)} />
          </div>

          <div className="rounded-xl border border-border/80 bg-muted/20 p-3">
            <Label htmlFor="id-upload" className="text-sm font-semibold">
              Client ID upload (JPG/PNG only) *
            </Label>
            <Input
              id="id-upload"
              type="file"
              className="mt-2"
              accept=".jpg,.jpeg,.png,image/jpeg,image/png"
              onChange={(e) => onFileChange(e.target.files?.[0] || null)}
            />
            <p className="mt-1 text-xs text-muted-foreground">
              Allowed types: JPG, JPEG, PNG. Max file size: 5MB. This image will be attached to emails sent to admin and agent.
            </p>
            {idAttachment && (
              <p className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-primary">
                <Upload className="h-3 w-3" />
                {idAttachment.name}
              </p>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button onClick={submitWorksheet} disabled={!canSubmit || submitting}>
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Submit worksheet"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

