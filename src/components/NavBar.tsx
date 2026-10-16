import * as React from 'react';
import { Link as RouterLink, useLocation, useNavigate } from 'react-router-dom';
import {
  AppBar, Toolbar, Typography, IconButton, Button, Box, Drawer,
  List, ListItemButton, ListItemText, Divider
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import { brand } from '../ui/brand';

type NavItem = { label: string; to: string };

const navItems: NavItem[] = [
  { label: 'Pallet', to: '/pallet' },
  { label: 'Product', to: '/item' },
  { label: 'Layer', to: '/layout' },
  { label: 'Build', to: '/build-composer' },
  { label: 'Robot', to: '/robot-placement' },
  { label: 'Run', to: '/run' },
];

export default function NavBar() {
  const [open, setOpen] = React.useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const isActive = (path: string) =>
    location.pathname === path || location.pathname.startsWith(path + '/');

  return (
    <>
      <AppBar
        position="sticky"
        elevation={0}
        sx={{
          background: `linear-gradient(90deg, ${brand.navy} 0%, ${brand.deepBlue} 55%, #163F9E 100%)`,
          borderBottom: `1px solid ${brand.navRing}`,
          backdropFilter: 'blur(10px)',
        }}
      >
        <Toolbar sx={{ gap: 1.5, minHeight: { xs: 52, md: 56 }, px: { xs: 1.25, md: 2 } }}>
          <IconButton
            edge="start"
            color="inherit"
            aria-label="menu"
            onClick={() => setOpen(true)}
            sx={{ display: { xs: 'inline-flex', md: 'none' } }}
          >
            <MenuIcon />
          </IconButton>

          <Box
            component={RouterLink}
            to="/dashboard"
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1.25,
              textDecoration: 'none',
              color: 'inherit',
              mr: { md: 2 },
              flexGrow: { xs: 1, md: 0 },
            }}
          >
            <Box
              component="img"
              src="/BB.png"
              alt="Brown Box"
              sx={{ width: 28, height: 28, objectFit: 'contain' }}
            />
            <Box sx={{ lineHeight: 1 }}>
              <Typography sx={{ fontWeight: 800, fontSize: '1.05rem', letterSpacing: '-0.02em', color: '#fff' }}>
                StackIt
              </Typography>
              <Typography sx={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.55)', display: { xs: 'none', sm: 'block' } }}>
                Palletizer
              </Typography>
            </Box>
          </Box>

          <Box sx={{ display: { xs: 'none', md: 'flex' }, gap: 0.35, ml: 1 }}>
            {navItems.map((item) => (
              <Button
                key={item.to}
                component={RouterLink}
                to={item.to}
                color="inherit"
                sx={{
                  px: 1.6,
                  minHeight: 34,
                  borderRadius: 1.5,
                  opacity: 0.92,
                  fontSize: '0.82rem',
                  fontWeight: 650,
                  ...(isActive(item.to)
                    ? {
                      bgcolor: 'rgba(255,255,255,0.14)',
                      boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.22)',
                    }
                    : {
                      '&:hover': { bgcolor: 'rgba(255,255,255,0.1)' },
                    }),
                }}
              >
                {item.label}
              </Button>
            ))}
          </Box>

          <Box sx={{ ml: 'auto', display: { xs: 'none', md: 'flex' } }}>
            <Button
              variant="outlined"
              size="small"
              onClick={() => {
                localStorage.removeItem('palletizer_demo_auth');
                navigate('/');
              }}
              sx={{
                color: 'white',
                borderColor: 'rgba(255,255,255,0.45)',
                fontWeight: 700,
                px: 1.6,
                borderRadius: 1.5,
                '&:hover': {
                  borderColor: 'white',
                  backgroundColor: 'rgba(255,255,255,0.12)',
                },
              }}
            >
              Logout
            </Button>
          </Box>
        </Toolbar>
      </AppBar>

      <Drawer
        anchor="left"
        open={open}
        onClose={() => setOpen(false)}
        PaperProps={{ sx: { width: 280, background: brand.surfaceAlt } }}
      >
        <Box sx={{ px: 2, py: 2.25, background: brand.navy, color: 'white' }}>
          <Typography variant="subtitle1" fontWeight={800}>
            StackIt
          </Typography>
          <Typography sx={{ fontSize: 12, opacity: 0.65 }}>Navigate workspace</Typography>
        </Box>
        <Divider />
        <List>
          <ListItemButton
            component={RouterLink}
            to="/dashboard"
            onClick={() => setOpen(false)}
            selected={location.pathname === '/dashboard'}
            sx={{ borderRadius: 1, mx: 1, my: 0.5 }}
          >
            <ListItemText primary="Dashboard" />
          </ListItemButton>
          {navItems.map((item) => (
            <ListItemButton
              key={item.to}
              component={RouterLink}
              to={item.to}
              onClick={() => setOpen(false)}
              selected={isActive(item.to)}
              sx={{
                borderRadius: 1,
                mx: 1,
                my: 0.5,
                '&.Mui-selected': {
                  bgcolor: 'rgba(30,78,216,0.08)',
                },
              }}
            >
              <ListItemText primary={item.label} />
            </ListItemButton>
          ))}
        </List>
      </Drawer>
    </>
  );
}
