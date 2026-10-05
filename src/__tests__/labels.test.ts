import { getDiseaseCategory, getDiseaseAlertMessage } from "@/lib/labels";

// ── Phase F: getDiseaseCategory — all 5 categories ───────────────────────────

describe("getDiseaseCategory", () => {
  describe("HEALTHY", () => {
    it("returns HEALTHY for HEALTHY_LEAF", () => {
      expect(getDiseaseCategory("HEALTHY_LEAF")).toBe("HEALTHY");
    });
    it("returns HEALTHY for healthy (lowercase)", () => {
      expect(getDiseaseCategory("healthy")).toBe("HEALTHY");
    });
    it("returns HEALTHY for Healthy_Leaf mixed case", () => {
      expect(getDiseaseCategory("Healthy_Leaf")).toBe("HEALTHY");
    });
  });

  describe("PEST", () => {
    it("returns PEST for ALLOCARIDARA_ATTACK", () => {
      expect(getDiseaseCategory("ALLOCARIDARA_ATTACK")).toBe("PEST");
    });
    it("returns PEST for Allocaridara_Attacked (variant spelling)", () => {
      expect(getDiseaseCategory("Allocaridara_Attacked")).toBe("PEST");
    });
  });

  describe("DISEASE", () => {
    it("returns DISEASE for LEAF_BLIGHT at high confidence", () => {
      expect(getDiseaseCategory("LEAF_BLIGHT", 85)).toBe("DISEASE");
    });
    it("returns DISEASE for ALGAL_LEAF_SPOT at high confidence", () => {
      expect(getDiseaseCategory("ALGAL_LEAF_SPOT", 92)).toBe("DISEASE");
    });
    it("returns DISEASE for PHOMOPSIS_LEAF_SPOT at 50% confidence exactly", () => {
      expect(getDiseaseCategory("PHOMOPSIS_LEAF_SPOT", 50)).toBe("DISEASE");
    });
  });

  describe("LOW_CONFIDENCE — Phase F boundary", () => {
    it("returns LOW_CONFIDENCE for disease code at 49.9%", () => {
      expect(getDiseaseCategory("LEAF_BLIGHT", 49.9)).toBe("LOW_CONFIDENCE");
    });
    it("returns LOW_CONFIDENCE for disease code at 20%", () => {
      expect(getDiseaseCategory("LEAF_BLIGHT", 20)).toBe("LOW_CONFIDENCE");
    });
    it("returns LOW_CONFIDENCE for literal LOW_CONFIDENCE code", () => {
      expect(getDiseaseCategory("LOW_CONFIDENCE")).toBe("LOW_CONFIDENCE");
    });
    it("does NOT downgrade HEALTHY to LOW_CONFIDENCE even at low confidence", () => {
      expect(getDiseaseCategory("HEALTHY_LEAF", 15)).toBe("HEALTHY");
    });
    it("handles confidence as decimal fraction (0.35 = 35%)", () => {
      expect(getDiseaseCategory("LEAF_BLIGHT", 0.35)).toBe("LOW_CONFIDENCE");
    });
  });

  describe("INVALID_IMAGE — Phase F boundary", () => {
    it("returns INVALID_IMAGE for empty code", () => {
      expect(getDiseaseCategory("")).toBe("INVALID_IMAGE");
    });
    it("returns INVALID_IMAGE for INVALID_IMAGE code", () => {
      expect(getDiseaseCategory("INVALID_IMAGE")).toBe("INVALID_IMAGE");
    });
    it("returns INVALID_IMAGE for disease at < 20% confidence", () => {
      expect(getDiseaseCategory("LEAF_BLIGHT", 19.9)).toBe("INVALID_IMAGE");
    });
    it("returns INVALID_IMAGE for confidence 0", () => {
      expect(getDiseaseCategory("LEAF_BLIGHT", 0)).toBe("INVALID_IMAGE");
    });
    it("handles confidence as decimal fraction (0.1 = 10%)", () => {
      expect(getDiseaseCategory("LEAF_BLIGHT", 0.1)).toBe("INVALID_IMAGE");
    });
  });
});

// ── getDiseaseAlertMessage ────────────────────────────────────────────────────

describe("getDiseaseAlertMessage", () => {
  it("healthy returns no-abnormality message", () => {
    const msg = getDiseaseAlertMessage("HEALTHY_LEAF");
    expect(msg).toContain("Chưa phát hiện");
  });
  it("pest returns pest warning", () => {
    const msg = getDiseaseAlertMessage("ALLOCARIDARA_ATTACK");
    expect(msg).toContain("sâu");
  });
  it("disease returns disease message", () => {
    const msg = getDiseaseAlertMessage("LEAF_BLIGHT", 90);
    expect(msg).toContain("bệnh");
  });
  it("low confidence prompts retake", () => {
    const msg = getDiseaseAlertMessage("LEAF_BLIGHT", 30);
    expect(msg).toContain("tin cậy");
  });
  it("invalid image prompts retake", () => {
    const msg = getDiseaseAlertMessage("LEAF_BLIGHT", 10);
    expect(msg).toContain("không hợp lệ");
  });
});
