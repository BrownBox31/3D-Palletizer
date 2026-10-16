import React, { useState } from "react";
import {
  Box,
  Typography,
  TextField,
  Button,
  IconButton,
  InputAdornment,
  Checkbox,
  FormControlLabel,
  Snackbar,
  Alert,
  useMediaQuery,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import { Visibility, VisibilityOff, ArrowForward } from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
import { brand } from "../ui/brand";

const DASHBOARD_ROUTE = "/dashboard";

const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const isMdUp = useMediaQuery("(min-width:960px)");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successOpen, setSuccessOpen] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const VALID_EMAIL = import.meta.env.VITE_LOGIN_EMAIL;
    const VALID_PASSWORD = import.meta.env.VITE_LOGIN_PASSWORD;

    if (!email.trim() || !password) {
      setError("Please enter your email and password.");
      return;
    }

    if (email !== VALID_EMAIL || password !== VALID_PASSWORD) {
      setError("Invalid email or password.");
      return;
    }

    if (remember) {
      localStorage.setItem("palletizer_demo_auth", "true");
    }

    setSuccessOpen(true);
    setTimeout(() => navigate(DASHBOARD_ROUTE), 350);
  };

  return (
    <Box
      sx={{
        height: "100%",
        width: "100%",
        display: "grid",
        gridTemplateColumns: isMdUp ? "1.35fr 0.9fr" : "1fr",
        overflow: "auto",
        background: brand.navy,
      }}
    >
      {/* Full-bleed industrial hero */}
      <Box
        sx={{
          position: "relative",
          minHeight: { xs: 280, md: "100vh" },
          display: { xs: "flex", md: "block" },
          alignItems: "flex-end",
          overflow: "hidden",
          "@keyframes stackitFade": {
            from: { opacity: 0, transform: "translateY(12px)" },
            to: { opacity: 1, transform: "translateY(0)" },
          },
          "@keyframes stackitPan": {
            from: { transform: "scale(1.06)" },
            to: { transform: "scale(1)" },
          },
        }}
      >
        <Box
          component="img"
          src="/loginPageImage.jpg"
          alt="Robotic palletizing cell"
          sx={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
            objectPosition: "center",
            animation: "stackitPan 8s ease-out forwards",
          }}
        />
        <Box
          sx={{
            position: "absolute",
            inset: 0,
            background: `
              linear-gradient(90deg, ${alpha(brand.navy, 0.82)} 0%, ${alpha(brand.navy, 0.35)} 55%, ${alpha(brand.navy, 0.15)} 100%),
              linear-gradient(180deg, ${alpha(brand.navy, 0.2)} 0%, ${alpha(brand.navy, 0.75)} 100%)
            `,
          }}
        />

        {/* subtle grid overlay */}
        <Box
          sx={{
            position: "absolute",
            inset: 0,
            opacity: 0.18,
            backgroundImage: `
              linear-gradient(${alpha("#fff", 0.12)} 1px, transparent 1px),
              linear-gradient(90deg, ${alpha("#fff", 0.12)} 1px, transparent 1px)
            `,
            backgroundSize: "48px 48px",
            maskImage: "linear-gradient(180deg, transparent, black 30%, black 70%, transparent)",
          }}
        />

        <Box
          sx={{
            position: "relative",
            zIndex: 1,
            p: { xs: 3, md: 6 },
            maxWidth: 560,
            animation: "stackitFade 700ms ease-out both",
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 3 }}>
            <Box
              component="img"
              src="/BB.png"
              alt="Brown Box"
              sx={{ width: 44, height: 44, objectFit: "contain" }}
            />
            <Typography
              sx={{
                color: "#fff",
                fontWeight: 800,
                fontSize: { xs: "1.75rem", md: "2.35rem" },
                letterSpacing: "-0.03em",
                lineHeight: 1,
              }}
            >
              StackIt
            </Typography>
          </Box>

          <Typography
            sx={{
              color: alpha("#fff", 0.92),
              fontWeight: 600,
              fontSize: { xs: "1.05rem", md: "1.35rem" },
              lineHeight: 1.35,
              mb: 1.5,
              maxWidth: 420,
            }}
          >
            Visual pallet pattern design for robotic stacking cells.
          </Typography>
          <Typography sx={{ color: alpha("#fff", 0.62), fontSize: 14, maxWidth: 400 }}>
            Configure SKUs, build interlocking layers, and assign builds to stations — without writing robot code.
          </Typography>
        </Box>
      </Box>

      {/* Sign-in panel */}
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          px: { xs: 3, sm: 5, md: 6 },
          py: { xs: 4, md: 6 },
          background: `
            radial-gradient(1200px 500px at 100% 0%, ${alpha(brand.primary, 0.08)}, transparent 55%),
            ${brand.surface}
          `,
          borderLeft: isMdUp ? `1px solid ${brand.border}` : "none",
          animation: "stackitFade 700ms ease-out 120ms both",
          "@keyframes stackitFade": {
            from: { opacity: 0, transform: "translateY(12px)" },
            to: { opacity: 1, transform: "translateY(0)" },
          },
        }}
      >
        <Typography
          sx={{
            fontWeight: 800,
            fontSize: { xs: "1.6rem", md: "1.85rem" },
            color: brand.ink,
            letterSpacing: "-0.02em",
            mb: 0.75,
          }}
        >
          Operator sign in
        </Typography>
        <Typography sx={{ color: brand.muted, mb: 3.5, fontSize: 14 }}>
          Access your pattern library and cell layout tools.
        </Typography>

        <Box component="form" onSubmit={handleSubmit} noValidate>
          <TextField
            fullWidth
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            margin="normal"
            required
          />

          <TextField
            fullWidth
            label="Password"
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            margin="normal"
            required
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    onClick={() => setShowPassword((s) => !s)}
                    edge="end"
                  >
                    {showPassword ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />

          <FormControlLabel
            sx={{ mt: 1, mb: 1 }}
            control={
              <Checkbox
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
                sx={{ color: brand.primary }}
              />
            }
            label={<Typography sx={{ fontSize: 14, color: brand.muted }}>Keep me signed in on this station</Typography>}
          />

          <Button
            type="submit"
            fullWidth
            variant="contained"
            endIcon={<ArrowForward />}
            sx={{
              mt: 1.5,
              py: 1.35,
              fontSize: "0.95rem",
            }}
          >
            Enter workspace
          </Button>

          {error && (
            <Alert severity="error" sx={{ mt: 2 }} onClose={() => setError(null)}>
              {error}
            </Alert>
          )}
        </Box>

        <Typography
          component="a"
          href="https://brownboxin.com/"
          target="_blank"
          rel="noopener noreferrer"
          sx={{
            mt: "auto",
            pt: 5,
            color: brand.muted,
            fontSize: 12,
            fontWeight: 600,
            textDecoration: "none",
            "&:hover": { color: brand.primary },
          }}
        >
          Powered by Brown Box Innovations
        </Typography>
      </Box>

      <Snackbar
        open={successOpen}
        autoHideDuration={1500}
        onClose={() => setSuccessOpen(false)}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert severity="success" variant="filled" sx={{ bgcolor: brand.emerald }}>
          Signed in. Opening workspace…
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default LoginPage;
