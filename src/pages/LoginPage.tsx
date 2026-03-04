import React, { useState } from "react";
import {
    Box,
    Paper,
    Avatar,
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
    Link as MuiLink,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import { Visibility, VisibilityOff, Login } from "@mui/icons-material";
import { useNavigate } from "react-router-dom";


const brand = {
    headerGrad: "linear-gradient(180deg, #173E9E 0%, #1E4ED8 100%)",
    pageBg: "linear-gradient(135deg, #F6F8FB 0%, #EDF2F7 100%)",
    cardBorder: "#E6EEF5",
    primaryBlue: "#1E4ED8",
    deepBlue: "#173E9E",
    emerald: "#10B981",
};

const DASHBOARD_ROUTE = "/dashboard";

/* ------------------------------- PAGE UI ------------------------------- */

const LoginPage: React.FC = () => {
    const navigate = useNavigate();
    const isMdUp = useMediaQuery("(min-width:900px)");

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
        setTimeout(() => {
            navigate(DASHBOARD_ROUTE);
        }, 350);
    };


    return (
        <Box
            sx={{
                minHeight: "100vh",
                width: "100vw",
                overflowX: "hidden",
                display: "grid",
                placeItems: "center",
                background: brand.pageBg,
            }}
        >
            <Paper
                elevation={0}
                sx={{
                    width: "min(96vw, 1100px)",
                    borderRadius: 3,
                    border: `1px solid ${brand.cardBorder}`,
                    overflow: "hidden",
                    bgcolor: alpha("#ffffff", 0.92),
                    backdropFilter: "blur(12px)",
                    display: "grid",
                    gridTemplateColumns: isMdUp ? "1.1fr 1fr" : "1fr",
                }}
            >
                {/* Left / Brand + Image Panel */}
                <Box sx={{ position: "relative", minHeight: { xs: 320, md: 560 }, background: brand.headerGrad, color: "#fff" }}>
                    {/* Heading */}
                    <Box
                        sx={{
                            position: "absolute",
                            top: { xs: 12, md: 16 },
                            left: { xs: 16, md: 24 },
                            right: { xs: 16, md: "auto" },
                            zIndex: 2,
                            display: "flex",
                            alignItems: "center",
                            gap: 1.25,
                        }}
                    >
                        <Avatar
                            src="/BB.png"
                            sx={{
                                width: 40,
                                height: 40,
                                background: "rgba(255,255,255,0.18)",
                                border: "2px solid rgba(255,255,255,0.35)",
                                objectFit: "contain",
                            }}
                        />

                        <Typography variant="h5" sx={{ fontWeight: 800, lineHeight: 1.1 }}>
                            StackIt
                        </Typography>
                    </Box>

                    {/* Hero Image */}
                    <Box sx={{ position: "absolute", inset: 0 }}>
                       
                        <Box
                            component="img"
                            src={"/loginPageImage1.png"}
                            alt="Automated warehouse with robotic arm"
                            sx={{ width: "100%", height: "100%", objectFit: "contain", opacity: 0.95 }}
                        />
                    </Box>


                    {/* Subtle caption bottom-left */}
                    <Box
                        sx={{
                            position: "absolute",
                            left: { xs: 16, md: 24 },
                            bottom: { xs: 12, md: 18 },
                            right: { xs: 16, md: "auto" },
                            p: 1,
                            px: 1.25,
                            borderRadius: 1.5,
                            background: "linear-gradient(90deg, rgba(0,0,0,0.25), rgba(0,0,0,0.05))",
                            border: "1px solid rgba(255,255,255,0.25)",
                            fontSize: 12,
                            opacity: 0.9,
                        }}
                    >
                        Automated warehouse visualization
                    </Box>
                </Box>

                {/* Right / Form Panel */}
                <Box sx={{ p: { xs: 4, md: 6 } }}>
                    <Typography
                        variant="h5"
                        sx={{
                            fontWeight: 800,
                            background: "linear-gradient(135deg, #173E9E 0%, #1E4ED8 100%)",
                            backgroundClip: "text",
                            WebkitBackgroundClip: "text",
                            WebkitTextFillColor: "transparent",
                            mb: 0.5,
                        }}
                    >
                        Welcome back
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                        Sign in to continue to your dashboard.
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

                        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mt: 1 }}>
                            <FormControlLabel
                                control={<Checkbox checked={remember} onChange={(e) => setRemember(e.target.checked)} />}
                                label="Remember me"
                            />
                            <MuiLink component="button" type="button" underline="hover" sx={{ color: brand.primaryBlue, fontWeight: 600 }}>
                                Forgot password?
                            </MuiLink>
                        </Box>

                        <Button
                            type="submit"
                            fullWidth
                            variant="contained"
                            startIcon={<Login />}
                            sx={{
                                mt: 2.5,
                                py: 1.2,
                                fontWeight: 800,
                                textTransform: "none",
                                borderRadius: 2,
                                background: "linear-gradient(135deg, #2A5BFF 0%, #1E4ED8 100%)",
                                boxShadow: `0 8px 22px ${alpha(brand.primaryBlue, 0.25)}`,
                                "&:hover": {
                                    background: "linear-gradient(135deg, #2A5BFF 0%, #1E4ED8 100%)",
                                    transform: "translateY(-1px)",
                                },
                            }}
                        >
                            Sign in
                        </Button>

                        {error && (
                            <Alert severity="error" sx={{ mt: 2 }} onClose={() => setError(null)}>
                                {error}
                            </Alert>
                        )}

                        <Box
                            sx={{
                                position: "absolute",
                                right: { xs: 16, md: 24 },
                                bottom: { xs: 12, md: 18 },
                                p: 1,
                                px: 1.25,
                                borderRadius: 1.5,
                                background: "linear-gradient(90deg, rgba(252, 249, 249, 0.25), rgba(0,0,0,0.05))",
                                border: "1px solid rgba(255,255,255,0.25)",
                                fontSize: 12,
                                opacity: 0.9,
                            }}
                        >
                            <a
                                href="https://brownboxin.com/"
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{
                                    color: "inherit",
                                    textDecoration: "none",
                                    fontWeight: 100,
                                }}
                            >
                                Powered by Brown Box Innovation
                            </a>
                        </Box>

                    </Box>
                </Box>
            </Paper>

            <Snackbar
                open={successOpen}
                autoHideDuration={1500}
                onClose={() => setSuccessOpen(false)}
                anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
            >
                <Alert severity="success" variant="filled" sx={{ bgcolor: brand.emerald }}>
                    Signed in. Redirecting to dashboard…
                </Alert>
            </Snackbar>
        </Box>
    );
};

export default LoginPage;