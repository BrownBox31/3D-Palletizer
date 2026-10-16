import React, { useMemo } from "react";
import {
  Typography,
  Button,
  Box,
  LinearProgress,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import { useNavigate } from "react-router-dom";
import {
  Inventory2,
  AllInbox,
  Layers,
  PrecisionManufacturing,
  ArrowForward,
  AccountTree,
  PlayCircle,
} from "@mui/icons-material";
import { brand } from "../ui/brand";
import { useAppStore } from "../store/store";
import { WORKFLOW_STEPS } from "../ui/workflow";

type Module = {
  step: string;
  title: string;
  description: string;
  meta: string;
  to: string;
  icon: typeof Inventory2;
  accent: string;
  ready: boolean;
};

const PalletizerDashboard: React.FC = () => {
  const navigate = useNavigate();

  const palletCount = useAppStore((s) => s.palletConfigs.length);
  const productCount = useAppStore((s) => s.boxConfigs.length);
  const layerCount = useAppStore((s) => s.savedLayouts.length);
  const buildCount = useAppStore((s) => s.savedPalletBuilds.length);
  const seedDemoData = useAppStore((s) => s.seedDemoData);

  const completedSteps = useMemo(() => {
    let n = 0;
    if (palletCount > 0) n += 1;
    if (productCount > 0) n += 1;
    if (layerCount > 0) n += 1;
    if (buildCount > 0) n += 1;
    if (buildCount > 0) n += 1;
    return n;
  }, [palletCount, productCount, layerCount, buildCount]);

  const progressPct = Math.round((completedSteps / 5) * 100);

  const nextStep = useMemo(() => {
    if (palletCount === 0) return { to: "/pallet", label: "Define first pallet" };
    if (productCount === 0) return { to: "/item", label: "Add a product SKU" };
    if (layerCount === 0) return { to: "/layout", label: "Build a layer pattern" };
    if (buildCount === 0) return { to: "/build-composer", label: "Compose a pallet build" };
    return { to: "/run", label: "Open Operator Run" };
  }, [palletCount, productCount, layerCount, buildCount]);

  const modules: Module[] = [
    {
      step: "01",
      title: "Pallet Config",
      description: "Pallet size & max load",
      meta: `${palletCount}`,
      to: "/pallet",
      icon: Inventory2,
      accent: brand.primary,
      ready: palletCount > 0,
    },
    {
      step: "02",
      title: "Product Config",
      description: "SKU dims & labels",
      meta: `${productCount}`,
      to: "/item",
      icon: AllInbox,
      accent: brand.emerald,
      ready: productCount > 0,
    },
    {
      step: "03",
      title: "Layer Builder",
      description: "3D / 2D patterns",
      meta: `${layerCount}`,
      to: "/layout",
      icon: Layers,
      accent: brand.deepBlue,
      ready: layerCount > 0,
    },
    {
      step: "04",
      title: "Build Composer",
      description: "Stack full builds",
      meta: `${buildCount}`,
      to: "/build-composer",
      icon: AccountTree,
      accent: brand.primaryBlue,
      ready: buildCount > 0,
    },
    {
      step: "05",
      title: "Robot Placement",
      description: "Left / Front / Right",
      meta: "Cell",
      to: "/robot-placement",
      icon: PrecisionManufacturing,
      accent: brand.amber,
      ready: buildCount > 0,
    },
    {
      step: "06",
      title: "Operator Run",
      description: "Start / stop recipe",
      meta: buildCount > 0 ? "Ready" : "—",
      to: "/run",
      icon: PlayCircle,
      accent: brand.emerald,
      ready: buildCount > 0,
    },
  ];

  return (
    <Box
      sx={{
        height: "100%",
        maxHeight: "100%",
        minHeight: 0,
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        gap: 1,
        px: { xs: 1.25, md: 2 },
        py: 1.25,
        background: `
          radial-gradient(700px 280px at 10% 0%, ${alpha(brand.primary, 0.12)}, transparent 55%),
          linear-gradient(180deg, #EEF2F7 0%, #E4EAF2 100%)
        `,
      }}
    >
      {/* Compact hero */}
      <Box
        sx={{
          flexShrink: 0,
          position: "relative",
          overflow: "hidden",
          borderRadius: 2.5,
          border: `1px solid ${alpha(brand.navy, 0.12)}`,
          background: `linear-gradient(115deg, ${brand.navy} 0%, ${brand.deepBlue} 50%, #1A4BB8 100%)`,
          color: "#fff",
          px: { xs: 2, md: 3 },
          py: { xs: 1.5, md: 1.75 },
          display: "grid",
          gridTemplateColumns: { xs: "1fr", md: "1fr auto" },
          gap: 1.5,
          alignItems: "center",
        }}
      >
        <Box>
          <Typography sx={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: alpha("#fff", 0.6), mb: 0.35 }}>
            StackIt workspace
          </Typography>
          <Typography sx={{ fontWeight: 800, fontSize: { xs: "1.25rem", md: "1.55rem" }, letterSpacing: "-0.03em", lineHeight: 1.15, mb: 0.35 }}>
            Pattern. Build. Place.
          </Typography>
          <Typography sx={{ color: alpha("#fff", 0.68), fontSize: 13, display: { xs: "none", sm: "block" } }}>
            Configure SKUs, design layers, and stage builds for the robotic cell.
          </Typography>
        </Box>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 1, alignItems: { xs: "stretch", md: "flex-end" } }}>
          <Button
            variant="contained"
            endIcon={<ArrowForward />}
            onClick={() => navigate(nextStep.to)}
            sx={{
              bgcolor: "#fff",
              color: brand.navy,
              px: 2,
              py: 1,
              minHeight: 44,
              fontWeight: 800,
              boxShadow: "none",
              whiteSpace: "nowrap",
              "&:hover": { bgcolor: alpha("#fff", 0.92) },
            }}
          >
            {nextStep.label}
          </Button>
          <Button
            variant="outlined"
            size="small"
            onClick={() => {
              if (window.confirm("Replace library with demo data? (pallets, SKUs, layer, build)")) {
                seedDemoData(true);
              }
            }}
            sx={{
              color: alpha("#fff", 0.9),
              borderColor: alpha("#fff", 0.45),
              fontWeight: 700,
              minHeight: 36,
              "&:hover": { borderColor: "#fff", bgcolor: alpha("#fff", 0.1) },
            }}
          >
            Load demo data
          </Button>
        </Box>
      </Box>

      {/* Progress + metrics row */}
      <Box
        sx={{
          flexShrink: 0,
          display: "grid",
          gridTemplateColumns: { xs: "1fr", md: "1.2fr 1fr" },
          gap: 1.25,
        }}
      >
        <Box
          sx={{
            p: 1.5,
            borderRadius: 2,
            border: `1px solid ${brand.cardBorder}`,
            background: alpha("#fff", 0.92),
          }}
        >
          <Box sx={{ display: "flex", justifyContent: "space-between", mb: 0.75 }}>
            <Typography sx={{ fontWeight: 800, fontSize: 13, color: brand.ink }}>Setup progress</Typography>
            <Typography sx={{ fontWeight: 800, fontSize: 13, color: brand.primary }}>{progressPct}%</Typography>
          </Box>
          <LinearProgress
            variant="determinate"
            value={progressPct}
            sx={{
              height: 6,
              borderRadius: 99,
              mb: 1,
              bgcolor: alpha(brand.primary, 0.1),
              "& .MuiLinearProgress-bar": { borderRadius: 99, background: brand.primaryG },
            }}
          />
          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
            {WORKFLOW_STEPS.filter((s) => s.id !== "run").map((s, i) => {
              const done =
                (i === 0 && palletCount > 0) ||
                (i === 1 && productCount > 0) ||
                (i === 2 && layerCount > 0) ||
                (i === 3 && buildCount > 0) ||
                (i === 4 && buildCount > 0);
              return (
                <Box
                  key={s.id}
                  onClick={() => navigate(s.path)}
                  sx={{
                    px: 1,
                    py: 0.35,
                    borderRadius: 1,
                    fontSize: 11,
                    fontWeight: 700,
                    cursor: "pointer",
                    color: done ? brand.emerald : brand.muted,
                    bgcolor: done ? alpha(brand.emerald, 0.1) : alpha(brand.ink, 0.04),
                    border: `1px solid ${done ? alpha(brand.emerald, 0.25) : brand.border}`,
                  }}
                >
                  {done ? "✓ " : `${s.index}. `}
                  {s.short}
                </Box>
              );
            })}
          </Box>
        </Box>

        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: 1,
          }}
        >
          {[
            { label: "Pallets", value: palletCount },
            { label: "Products", value: productCount },
            { label: "Layers", value: layerCount },
            { label: "Builds", value: buildCount },
          ].map((m) => (
            <Box
              key={m.label}
              sx={{
                px: 1.25,
                py: 1.1,
                borderRadius: 2,
                border: `1px solid ${brand.cardBorder}`,
                background: alpha("#fff", 0.92),
                minWidth: 0,
              }}
            >
              <Typography sx={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: brand.muted }}>
                {m.label}
              </Typography>
              <Typography sx={{ fontWeight: 800, fontSize: { xs: "1.2rem", md: "1.45rem" }, color: brand.ink, lineHeight: 1.15 }}>
                {m.value}
              </Typography>
            </Box>
          ))}
        </Box>
      </Box>

      {/* Modules grid — fits remaining height */}
      <Box
        sx={{
          flex: 1,
          minHeight: 0,
          display: "grid",
          gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr", md: "repeat(3, 1fr)" },
          gridTemplateRows: { md: "1fr 1fr" },
          gap: 1.25,
        }}
      >
        {modules.map((m) => {
          const Icon = m.icon;
          return (
            <Box
              key={m.to}
              onClick={() => navigate(m.to)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") navigate(m.to);
              }}
              sx={{
                cursor: "pointer",
                minHeight: 0,
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                p: { xs: 1.5, md: 1.75 },
                borderRadius: 2.5,
                border: `1px solid ${brand.cardBorder}`,
                background: alpha("#fff", 0.94),
                transition: "border-color .15s ease, box-shadow .15s ease",
                "&:hover": {
                  boxShadow: brand.shadowSm,
                  borderColor: alpha(m.accent, 0.4),
                },
              }}
            >
              <Box sx={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 1 }}>
                <Box
                  sx={{
                    width: 40,
                    height: 40,
                    borderRadius: 1.5,
                    display: "grid",
                    placeItems: "center",
                    bgcolor: alpha(m.accent, 0.1),
                    color: m.accent,
                    flexShrink: 0,
                  }}
                >
                  <Icon sx={{ fontSize: 22 }} />
                </Box>
                <Typography sx={{ fontSize: 11, fontWeight: 800, color: m.ready ? brand.emerald : brand.muted }}>
                  {m.meta}
                </Typography>
              </Box>

              <Box sx={{ mt: 1 }}>
                <Typography sx={{ fontSize: 11, fontWeight: 800, color: brand.muted, letterSpacing: "0.04em" }}>
                  {m.step}
                </Typography>
                <Typography sx={{ fontWeight: 800, color: brand.ink, fontSize: "0.98rem", lineHeight: 1.2 }}>
                  {m.title}
                </Typography>
                <Typography sx={{ color: brand.muted, fontSize: 12, mt: 0.25, display: { xs: "none", md: "block" } }}>
                  {m.description}
                </Typography>
              </Box>

              <Box sx={{ display: "flex", justifyContent: "flex-end", mt: 1 }}>
                <ArrowForward sx={{ fontSize: 18, color: brand.ink, opacity: 0.45 }} />
              </Box>
            </Box>
          );
        })}
      </Box>
    </Box>
  );
};

export default PalletizerDashboard;
