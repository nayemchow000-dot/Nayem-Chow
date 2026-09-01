const fs = require('fs');
let content = fs.readFileSync('src/pages/Contacts.tsx', 'utf8');

const oldLink = `                        <Link to={\`/contacts/\${contact.id}\`} className="font-medium text-[#E5E5E7] group-hover:text-emerald-500 transition-colors block">
                          {contact.name}
                        </Link>
                        <div className="text-white/40 text-[10px] mt-0.5">{contact.area || 'Unknown area'}</div>`;
const newLink = `                        <div className="font-medium text-[#E5E5E7] group-hover:text-emerald-500 transition-colors block">
                          {contact.name}
                        </div>
                        <div className="text-white/40 text-[10px] mt-0.5">{contact.area || 'Unknown area'}</div>`;

content = content.replace(oldLink, newLink);

const oldTr = `                    <tr key={contact.id} className="hover:bg-white/[0.02] transition-colors group">`;
const newTr = `                    <tr key={contact.id} className="hover:bg-white/[0.02] transition-colors group cursor-pointer" onClick={() => window.location.href = '/contacts/' + contact.id}>`;
content = content.replace(oldTr, newTr);

const oldTrash = `                          onClick={() => setContactToDelete(contact.id)}`;
const newTrash = `                          onClick={(e) => { e.stopPropagation(); setContactToDelete(contact.id); }}`;
content = content.replace(oldTrash, newTrash);

// Make table responsive
const oldTableContainer = `<div className="overflow-x-auto">
            <table className="w-full text-sm text-left border-collapse whitespace-nowrap">`;
const newTableContainer = `<div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm text-left border-collapse whitespace-nowrap">`;
content = content.replace(oldTableContainer, newTableContainer);

// Append mobile cards view
const tableEndStr = `</table>
          </div>`;
const mobileView = `</table>
          </div>
          
          <div className="md:hidden flex flex-col divide-y divide-white/5">
            {loading ? (
              <div className="p-8 text-center text-white/40">Loading contacts...</div>
            ) : error ? (
              <div className="p-8 text-center text-rose-500 bg-rose-500/5">{error}</div>
            ) : filtered.length === 0 ? (
              <div className="p-8 text-center text-white/40">No contacts found.</div>
            ) : (
              filtered.map(contact => (
                <div 
                  key={contact.id} 
                  className="p-4 flex flex-col gap-3 active:bg-white/5 cursor-pointer"
                  onClick={() => window.location.href = '/contacts/' + contact.id}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-medium text-[#E5E5E7]">{contact.name}</div>
                      <div className="text-white/40 text-[10px] mt-0.5">{contact.area || 'Unknown area'}</div>
                    </div>
                    <PriorityBadge level={contact.priorityLevel} />
                  </div>
                  
                  <div className="flex justify-between items-end">
                    <div className="flex flex-col gap-1">
                      <span className="px-2 py-1 bg-white/5 border border-white/10 rounded w-fit text-[10px] text-white/60">
                        {STAGES[contact.currentStage - 1] || \`Stage \${contact.currentStage}\`}
                      </span>
                      <div className="text-[10px] text-white/40">
                        Growth: <span className="text-[#E5E5E7]">{contact.growthScore}%</span> 
                        <span className="ml-2">Last: {Math.random() > 0.5 ? 'Yesterday' : '3 Days Ago'}</span>
                      </div>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-8 w-8 p-0 text-rose-500/70 hover:text-rose-500 hover:bg-rose-500/10"
                      onClick={(e) => { e.stopPropagation(); setContactToDelete(contact.id); }}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>`;
content = content.replace(tableEndStr, mobileView);

fs.writeFileSync('src/pages/Contacts.tsx', content);
