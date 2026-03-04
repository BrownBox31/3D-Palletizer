import React from "react";
import {
  Typography,
  Button,
  Box,
  Container,
  Avatar,
  Paper,
  Card,
  CardContent,
  useMediaQuery,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import Grid from "@mui/material/Grid"; 
import { useNavigate } from "react-router-dom";
import {
  Inventory2,
  AllInbox,
  Layers,
  PrecisionManufacturing,
  Dashboard as DashboardIcon,
  PlayArrow,
} from "@mui/icons-material";

const brand = {
  headerGrad: "linear-gradient(180deg, #173E9E 0%, #1E4ED8 100%)",
  pageBg: "linear-gradient(135deg, #F6F8FB 0%, #EDF2F7 100%)",
  cardBorder: "#E6EEF5",
  primaryBlue: "#1E4ED8",
  deepBlue: "#173E9E",
  emerald: "#10B981",
  violet: "#7C3AED",
  amber: "#F59E0B",
};

type Tile = {
  title: string;
  description: string;
  icon: typeof Inventory2;
  to: string;
  color: string;
  gradient: string;
};

const PalletizerDashboard: React.FC = () => {
  const navigate = useNavigate();

  const tiles: Tile[] = [
    {
      title: "Pallet Config",
      description: "Define pallet specs & weight limits.",
      icon: Inventory2,
      to: "/pallet",
      color: brand.primaryBlue,
      gradient: "linear-gradient(135deg, #2A5BFF 0%, #1E4ED8 100%)",
    },
    {
      title: "Product Config",
      description: "Create product types and labels.",
      icon: AllInbox,
      to: "/item",
      color: brand.emerald,
      gradient: "linear-gradient(135deg, #10B981 0%, #059669 100%)",
    },
    {
      title: "Layer Builder",
      description: "Create and save layer layouts.",
      icon: Layers,
      to: "/layout",
      color: brand.violet,
      gradient: "linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%)",
    },
    {
      title: "Pallet Build Composer",
      description: "Stack layers into a complete pallet.",
      icon: Layers,
      to: "/build-composer",
      color: brand.deepBlue,
      gradient: "linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)",
    },
    {
      title: "Robot Placement",
      description: "Assign Left / Right / Front.",
      icon: PrecisionManufacturing,
      to: "/robot-placement",
      color: brand.amber,
      gradient: "linear-gradient(135deg, #F59E0B 0%, #D97706 100%)",
    },
  ];

   const lockScrollForLarge = useMediaQuery('(min-width:768px)');

  return (
    <Box
    sx={{
      height: '100vh',
      overflow: lockScrollForLarge ? 'hidden' : 'auto',
      overscrollBehavior: 'none',
      background: brand.pageBg,
      width: '100vw',  
      overflowX: 'hidden', 
    }}
  >
      <Container maxWidth="xl">
        {/* Header */}
        <Box sx={{ textAlign: "center", mb: 5 }}>
          <Avatar
            sx={{
              width: 80,
              height: 80,
              mx: "auto",
              mb: 2,
              background: brand.headerGrad,
              boxShadow: "0 8px 32px rgba(30,78,216,0.35)",
            }}
          >
            <DashboardIcon sx={{ fontSize: 38 }} />
          </Avatar>

          <Typography
            variant="h4"
            sx={{
              fontWeight: 800,
              background: "linear-gradient(135deg, #173E9E 0%, #1E4ED8 100%)",
              backgroundClip: "text",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              mb: 0.5,
            }}
          >
            Palletizer Dashboard
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Configure, compose, and place pallets with a guided flow.
          </Typography>
        </Box>

        {/* Tiles — desktop: 4 cols, tablet: 2 cols, mobile: 1 col */}
        <Grid container spacing={2} alignItems="stretch">
          {tiles.map((t) => (
            <Grid key={t.title} size={{ xs: 12, sm: 2.4, md: 2.3 }}>
              <Card
                elevation={0}
                sx={{
                  height: "100%",
                  display: "flex",
                  flexDirection: "column",
                  background: alpha("#ffffff", 0.92),
                  backdropFilter: "blur(12px)",
                  border: `1px solid ${brand.cardBorder}`,
                  borderRadius: 2,
                  transition: "all .25s ease",
                  "&:hover": {
                    transform: "translateY(-3px)",
                    boxShadow: "0 10px 28px rgba(0,0,0,0.10)",
                  },
                }}
              >
                <CardContent
                  sx={{ p: 2.25, display: "flex", flexDirection: "column", height: "100%" }}
                >
                  <Box sx={{ textAlign: "center", mb: 1.5 }}>
                    <Avatar
                      sx={{
                        width: 46,
                        height: 46,
                        mx: "auto",
                        mb: 1,
                        background: t.gradient,
                        boxShadow: "0 4px 14px rgba(0,0,0,0.10)",
                      }}
                    >
                      <t.icon sx={{ fontSize: 22 }} />
                    </Avatar>

                    <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 0.5 }}>
                      {t.title}
                    </Typography>

                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{ display: "block", lineHeight: 1.3, px: 1 }}
                    >
                      {t.description}
                    </Typography>
                  </Box>

                  <Button
                    fullWidth
                    variant="contained"
                    startIcon={<PlayArrow />}
                    onClick={() => navigate(t.to)}
                    sx={{
                      mt: "auto",
                      borderRadius: 2,
                      py: 0.9,
                      fontSize: "0.8rem",
                      background: t.gradient,
                      textTransform: "none",
                      fontWeight: 700,
                      "&:hover": {
                        background: t.gradient,
                        transform: "translateY(-1px)",
                        boxShadow: `0 8px 22px ${alpha(t.color, 0.25)}`,
                      },
                    }}
                  >
                    Start
                  </Button>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>

        {/* Quick Guide */}
        <Paper
          elevation={0}
          sx={{
            mt: 6,
            p: { xs: 3, md: 4 },
            background: alpha("#ffffff", 0.92),
            border: `1px solid ${brand.cardBorder}`,
            borderRadius: 3,
            textAlign: "center",
          }}
        >
          <Typography variant="h6" fontWeight={800} sx={{ mb: 1 }}>
            Quick Start Guide
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Follow these steps to go from configuration to robot placement.
          </Typography>

          <Grid container spacing={3} sx={{ maxWidth: 880, mx: "auto" }}>
            <Grid size={{ xs: 12, sm: 3, md: 2 }}>
              <Step number="1" label="Pallet Config" caption="Set pallet specs" />
            </Grid>
           <Grid size={{ xs: 12, sm: 2, md: 2 }}>
              <Step number="2" label="Product Config" caption="Set product specs" />
            </Grid>
            <Grid size={{ xs: 12, sm: 2, md: 2 }}>
              <Step number="3" label="Layer Builder" caption="Create & save layers" color="success" />
            </Grid>
           <Grid size={{ xs: 12, sm: 3, md: 3 }}>
              <Step number="4" label="Build Composer" caption="Stack layers to pallet" color="secondary" />
            </Grid>
              <Grid size={{ xs: 12, sm: 2, md: 3 }}>
              <Step number="5" label="Robot Placement" caption="Assign Left / Right / Front" color="warning" />
            </Grid>
          </Grid>
        </Paper>
      </Container>
    </Box>
  );
};

const Step: React.FC<{
  number: string;
  label: string;
  caption: string;
  color?: "primary" | "secondary" | "success" | "warning" | "info" | "error";
}> = ({ number, label, caption, color = "primary" }) => (
  <Box sx={{ textAlign: "center" }}>
    <Avatar sx={{ mx: "auto", mb: 1, bgcolor: `${color}.main` }}>{number}</Avatar>
    <Typography variant="body2" fontWeight={700}>{label}</Typography>
    <Typography variant="caption" color="text.secondary">{caption}</Typography>
  </Box>
);

export default PalletizerDashboard;
