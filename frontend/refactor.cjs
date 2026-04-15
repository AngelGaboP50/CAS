const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'src');

// 1. Crear nueva estructura
const dirsToMake = [
  'core/config',
  'shared/styles',
  'features/auth/pages',
  'features/dashboard/pages',
  'features/admin/pages',
  'features/salones/components',
  'features/salones/hooks',
  'features/notificaciones/hooks'
];

dirsToMake.forEach(d => {
  fs.mkdirSync(path.join(srcDir, d), { recursive: true });
});

// 2. Mover archivos
const moves = [
  { from: 'supabaseClient.ts', to: 'core/config/supabaseClient.ts' },
  { from: 'pages/DashboardPage.css', to: 'shared/styles/DashboardPage.css' },
  { from: 'pages/LoginPage.tsx', to: 'features/auth/pages/LoginPage.tsx' },
  { from: 'pages/RegisterPage.tsx', to: 'features/auth/pages/RegisterPage.tsx' },
  { from: 'pages/ForgotPasswordPage.tsx', to: 'features/auth/pages/ForgotPasswordPage.tsx' },
  { from: 'pages/LoginPage.css', to: 'features/auth/pages/LoginPage.css' },
  { from: 'pages/DashboardPage.tsx', to: 'features/dashboard/pages/DashboardPage.tsx' },
  { from: 'pages/AdminDashboardPage.tsx', to: 'features/admin/pages/AdminDashboardPage.tsx' },
  { from: 'components/InteractiveMap.tsx', to: 'features/salones/components/InteractiveMap.tsx' },
  { from: 'components/InteractiveMap.css', to: 'features/salones/components/InteractiveMap.css' },
  { from: 'hooks/useAulas.ts', to: 'features/salones/hooks/useAulas.ts' },
  { from: 'hooks/useNotificaciones.ts', to: 'features/notificaciones/hooks/useNotificaciones.ts' }
];

moves.forEach(m => {
  const source = path.join(srcDir, m.from);
  const dest = path.join(srcDir, m.to);
  if (fs.existsSync(source)) {
    fs.renameSync(source, dest);
    console.log(`Moved ${m.from} to ${m.to}`);
  } else {
    console.log(`WARN: No se encontro ${m.from}`);
  }
});

// 3. Reemplazar imports
const replacements = {
  'App.tsx': [
    ["./pages/LoginPage", "./features/auth/pages/LoginPage"],
    ["./pages/RegisterPage", "./features/auth/pages/RegisterPage"],
    ["./pages/ForgotPasswordPage", "./features/auth/pages/ForgotPasswordPage"],
    ["./pages/DashboardPage", "./features/dashboard/pages/DashboardPage"],
    ["./pages/AdminDashboardPage", "./features/admin/pages/AdminDashboardPage"]
  ],
  'features/auth/pages/LoginPage.tsx': [
    ["../supabaseClient", "../../../core/config/supabaseClient"]
  ],
  'features/auth/pages/RegisterPage.tsx': [
    ["../supabaseClient", "../../../core/config/supabaseClient"]
  ],
  'features/auth/pages/ForgotPasswordPage.tsx': [
    ["../supabaseClient", "../../../core/config/supabaseClient"]
  ],
  'features/dashboard/pages/DashboardPage.tsx': [
    ["../supabaseClient", "../../../core/config/supabaseClient"],
    ["../hooks/useNotificaciones", "../../notificaciones/hooks/useNotificaciones"],
    ["./DashboardPage.css", "../../../shared/styles/DashboardPage.css"]
  ],
  'features/admin/pages/AdminDashboardPage.tsx': [
    ["../supabaseClient", "../../../core/config/supabaseClient"],
    ["./DashboardPage.css", "../../../shared/styles/DashboardPage.css"],
    ["../components/InteractiveMap", "../../salones/components/InteractiveMap"],
    ["../hooks/useAulas", "../../salones/hooks/useAulas"],
    ["../hooks/useNotificaciones", "../../notificaciones/hooks/useNotificaciones"]
  ],
  'features/salones/components/InteractiveMap.tsx': [
    // El import de './InteractiveMap.css' se mantiene igual
    // El import de '../hooks/useAulas' se mantiene ../hooks/useAulas relativo a components/
  ],
  'features/salones/hooks/useAulas.ts': [
    ["../supabaseClient", "../../../core/config/supabaseClient"]
  ],
  'features/notificaciones/hooks/useNotificaciones.ts': [
    ["../supabaseClient", "../../../core/config/supabaseClient"]
  ]
};

Object.keys(replacements).forEach(filepath => {
  const fullPath = path.join(srcDir, filepath);
  if (fs.existsSync(fullPath)) {
    let content = fs.readFileSync(fullPath, 'utf-8');
    replacements[filepath].forEach(([search, replace]) => {
      content = content.split(`'${search}'`).join(`'${replace}'`);
      content = content.split(`"${search}"`).join(`"${replace}"`);
    });
    fs.writeFileSync(fullPath, content, 'utf-8');
    console.log(`Updated imports in ${filepath}`);
  }
});

// Intentar borrar las carpetas viejas si estan vacias
try { fs.rmdirSync(path.join(srcDir, 'pages')); } catch (e) {}
try { fs.rmdirSync(path.join(srcDir, 'components')); } catch (e) {}
try { fs.rmdirSync(path.join(srcDir, 'hooks')); } catch (e) {}

console.log('Refactorizacion completada exitosamente.');
