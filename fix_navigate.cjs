const fs = require('fs');
let content = fs.readFileSync('src/pages/Contacts.tsx', 'utf8');

if (!content.includes('useNavigate')) {
  content = content.replace('import { Link } from \'react-router\';', 'import { Link, useNavigate } from \'react-router\';');
  
  // Inject useNavigate
  content = content.replace('export default function Contacts() {', 'export default function Contacts() {\n  const navigate = useNavigate();');
}

// Replace window.location.href with navigate
content = content.replace(/window\.location\.href = '\/contacts\/' \+ contact\.id/g, "navigate(`/contacts/${contact.id}`)");

fs.writeFileSync('src/pages/Contacts.tsx', content);
