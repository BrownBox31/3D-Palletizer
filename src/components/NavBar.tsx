import * as React from 'react';
import { Link as RouterLink, useLocation, useNavigate } from 'react-router-dom';
import {
  AppBar, Toolbar, Typography, IconButton, Button, Box, Drawer,
  List, ListItemButton, ListItemText, Divider
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import ViewInArIcon from '@mui/icons-material/ViewInAr';

type NavItem = { label: string; to: string };

const navItems: NavItem[] = [
  { label: 'Pallet Config', to: '/pallet' },
  { label: 'Product Config', to: '/item' },
  { label: 'Layer Builder', to: '/layout' },
  { label: 'Pallet Builder', to: '/build-composer' },
  { label: 'Robot Placement', to: '/robot-placement' },
  // { label: 'Box Placement', to: '/box-placement' }
];

const BRAND = {
  start: '#0F4CFF',   // bright royal blue
  mid: '#0A3EDB',   // brand mid
  end: '#022B95',   // deep navy
  surface: '#F3F6FB', // app background tint
  ring: 'rgba(255,255,255,0.28)',
  active: 'rgba(255,255,255,0.16)',
  hover: 'rgba(255,255,255,0.22)'
};

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
          background: `linear-gradient(90deg, ${BRAND.start} 0%, ${BRAND.mid} 55%, ${BRAND.end} 100%)`,
          borderBottom: `1px solid ${BRAND.ring}`,
        }}
      >
        <Toolbar sx={{ gap: 2, minHeight: 64 }}>
          <IconButton
            edge="start"
            color="inherit"
            aria-label="menu"
            onClick={() => setOpen(true)}
            sx={{ display: { xs: 'inline-flex', md: 'none' } }}
          >
            <MenuIcon />
          </IconButton>

          <ViewInArIcon sx={{ mr: 1, opacity: 0.95 }} />
          <Typography
            variant="h6"
            component={RouterLink}
            to="/dashboard"
            sx={{
              color: 'white',
              textDecoration: 'none',
              letterSpacing: 0.2,
              fontWeight: 700,
              flexGrow: { xs: 1, md: 0 }
            }}
          >
            Palletizer
          </Typography>

          {/* Desktop links */}
          <Box sx={{ display: { xs: 'none', md: 'flex' }, ml: 2, gap: 0.5 }}>
            {navItems.map((item) => (
              <Button
                key={item.to}
                component={RouterLink}
                to={item.to}
                color="inherit"
                sx={{
                  px: 1.75,
                  borderRadius: 2,
                  opacity: 0.95,
                  textTransform: 'none',
                  fontWeight: 600,
                  ...(isActive(item.to)
                    ? {
                      bgcolor: BRAND.active,
                      boxShadow: `inset 0 0 0 1px ${BRAND.ring}`,
                      '&:hover': { bgcolor: BRAND.hover }
                    }
                    : {
                      '&:hover': { bgcolor: BRAND.active }
                    })
                }}
              >
                {item.label}
              </Button>
            ))}
          </Box>

          {/* Right side actions */}
          <Box sx={{ ml: 'auto', display: { xs: 'none', md: 'flex' }, gap: 1 }}>
            <Button
              variant="outlined"
              onClick={() => {
                localStorage.removeItem("palletizer_demo_auth"); 
                navigate("/");
              }}
              sx={{
                color: 'white',
                borderColor: 'rgba(255,255,255,0.65)',
                textTransform: 'none',
                fontWeight: 600,
                px: 1.8,
                borderRadius: 2,
                '&:hover': {
                  borderColor: 'white',
                  backgroundColor: 'rgba(255,255,255,0.15)'
                }
              }}
            >
              Logout
            </Button>
          </Box>

        </Toolbar>
      </AppBar>

      {/* Mobile drawer */}
      <Drawer
        anchor="left"
        open={open}
        onClose={() => setOpen(false)}
        PaperProps={{
          sx: {
            width: 280,
            background: BRAND.surface
          }
        }}
      >
        <Box
          sx={{
            px: 2,
            py: 2,
            background: `linear-gradient(90deg, ${BRAND.start} 0%, ${BRAND.mid} 60%, ${BRAND.end} 100%)`,
            color: 'white'
          }}
        >
          <Typography variant="subtitle1" fontWeight={700}>
            Navigate
          </Typography>
        </Box>
        <Divider />
        <List>
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
                  bgcolor: 'rgba(15,76,255,0.08)',
                  '&:hover': { bgcolor: 'rgba(15,76,255,0.12)' }
                }
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
