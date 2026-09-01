const fs = require('fs');
let content = fs.readFileSync('src/pages/Activities.tsx', 'utf8');

if (!content.includes('useNavigate')) {
  content = "import { useNavigate } from 'react-router';\n" + content;
  content = content.replace('export default function Activities() {', 'export default function Activities() {\n  const navigate = useNavigate();');
}

fs.writeFileSync('src/pages/Activities.tsx', content);
