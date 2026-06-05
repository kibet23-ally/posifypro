// src/pages/SuperAdminDashboard.tsx
import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import LicenseManager from "@/components/admin/LicenseManager";
import { AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { LayoutDashboard, Building2, TrendingUp, Users, Crown, Shield, UserCheck, CheckCircle2, XCircle, LogOut, Zap, RefreshCw, Search, X, ChevronRight, Bell, Settings, Key, AlertTriangle } from "lucide-react";

type AdminTab = "overview" | "tenants" | "analytics" | "staff" | "licenses" | "activity" | "settings";
interface Tenant { id: string; name: string; slug: string; email: string; plan: "free"|"basic"|"pro"; is_active: boolean; created_at: string; currency: string; staff_count?: number; order_count?: number; }
interface KPI { totalTenants: number; activeTenants: number; newThisMonth: number; suspendedTenants: number; totalStaff: number; proTenants: number; basicTenants: number; freeTenants: number; tenantGrowth: number; }
interface GP { month: string; tenants: number; }

const PC = { free: { c: "#94a3b8", bg: "#f1f5f9", l: "Free" }, basic: { c: "#3b82f6", bg: "#eff6ff", l: "Basic" }, pro: { c: "#8b5cf6", bg: "#f5f3ff", l: "Pro" } };
const PCOLS = ["#94a3b8","#3b82f6","#8b5cf6"];
const MO = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const RC: Record<string,{color:string;bg:string;icon:any}> = { owner:{color:"#f59e0b",bg:"#fffbeb",icon:Crown}, manager:{color:"#3b82f6",bg:"#eff6ff",icon:Shield}, cashier:{color:"#10b981",bg:"#f0fdf4",icon:UserCheck} };
const NAV = [
  {id:"overview",l:"Overview",icon:LayoutDashboard},
  {id:"tenants",l:"Businesses",icon:Building2},
  {id:"analytics",l:"Analytics",icon:TrendingUp},
  {id:"staff",l:"All Staff",icon:Users},
  {id:"licenses",l:"Licenses",icon:Key},
  {id:"activity",l:"Activity",icon:Bell},
  {id:"settings",l:"Settings",icon:Settings},
] as const;

function Badge({plan}:{plan:"free"|"basic"|"pro"}) {
  const c = PC[plan];
  return <span style={{background:c.bg,color:c.c,padding:"2px 9px",borderRadius:"99px",fontSize:"10px",fontWeight:"700",textTransform:"uppercase",border:`1px solid ${c.c}30`}}>{c.l}</span>;
}

function KCard({label,value,icon:I,trend,color,loading,sub}:{label:string;value:string;icon:any;trend?:number;color:string;loading?:boolean;sub?:string}) {
  const up=(trend??0)>=0;
  return (
    <div style={{background:"#fff",borderRadius:"14px",padding:"18px",boxShadow:"0 1px 3px rgba(0,0,0,0.06)",border:"1px solid #f1f5f9"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:"12px"}}>
        <div style={{background:`${color}15`,borderRadius:"10px",padding:"8px"}}><I style={{width:"17px",height:"17px",color}} /></div>
        {trend!==undefined && <span style={{fontSize:"11px",fontWeight:"700",padding:"2px 7px",borderRadius:"99px",background:up?"#f0fdf4":"#fef2f2",color:up?"#16a34a":"#dc2626"}}>{up?"↑":"↓"} {Math.abs(trend)}%</span>}
      </div>
      {loading ? <div style={{height:"28px",background:"#f1f5f9",borderRadius:"6px",marginBottom:"6px"}} /> : <div style={{fontSize:"24px",fontWeight:"800",color:"#0f172a"}}>{value}</div>}
      <div style={{fontSize:"12px",color:"#94a3b8",marginTop:"4px"}}>{label}</div>
      {sub && <div style={{fontSize:"11px",color:"#cbd5e1",marginTop:"2px"}}>{sub}</div>}
    </div>
  );
}

const CT = ({active,payload,label}:any) => !active||!payload?.length ? null : (
  <div style={{background:"#0f172a",borderRadius:"8px",padding:"8px 12px",fontSize:"12px",color:"#fff"}}>
    <div style={{color:"#94a3b8",marginBottom:"4px"}}>{label}</div>
    {payload.map((p:any)=><div key={p.name} style={{fontWeight:"700"}}>{p.name}: {p.value}</div>)}
  </div>
);

export default function SuperAdminDashboard() {
  const {user} = useAuth();
  const navigate = useNavigate();
  const [tab,setTab] = useState<AdminTab>("overview");
  const [tenants,setTenants] = useState<Tenant[]>([]);
  const [allStaff,setAllStaff] = useState<any[]>([]);
  const [kpi,setKpi] = useState<KPI|null>(null);
  const [gd,setGd] = useState<GP[]>([]);
  const [loading,setLoading] = useState(true);
  const [refreshing,setRefreshing] = useState(false);
  const [search,setSearch] = useState("");
  const [ss,setSs] = useState("");
  const [fp,setFp] = useState<"all"|"free"|"basic"|"pro">("all");
  const [fs,setFs] = useState<"all"|"active"|"suspended">("all");
  const [sel,setSel] = useState<Tenant|null>(null);
  const [al,setAl] = useState(false);
  const [sidebarOpen,setSidebarOpen] = useState(false);
  const [sortBy,setSortBy] = useState<"newest"|"staff"|"orders">("newest");
  const [isMobile,setIsMobile] = useState(typeof window!=="undefined"&&window.innerWidth<768);

  useEffect(()=>{
    const h=()=>setIsMobile(window.innerWidth<768);
    window.addEventListener("resize",h);
    return ()=>window.removeEventListener("resize",h);
  },[]);

  useEffect(()=>{
    if(!user)return;
    supabase.from("profiles").select("role").eq("id",user.id).single().then(({data})=>{if(data?.role!=="super_admin")navigate({to:"/dashboard"});});
  },[user]);

  const load = useCallback(async()=>{
    setRefreshing(true);
    try {
      const {data:tr}=await supabase.from("tenants").select("*").neq("slug","posifypro").order("created_at",{ascending:false});
      if(!tr)return;
      const en:Tenant[]=await Promise.all(tr.map(async t=>{
        const [sr,or]=await Promise.all([
          supabase.from("profiles").select("id",{count:"exact",head:true}).eq("tenant_id",t.id),
          supabase.from("orders").select("id",{count:"exact",head:true}).eq("tenant_id",t.id),
        ]);
        return {...t,staff_count:sr.count??0,order_count:or.count??0};
      }));
      setTenants(en);
      const {data:sd}=await supabase.from("profiles").select("*,tenants(name)").neq("role","super_admin").order("created_at",{ascending:false});
      setAllStaff(sd??[]);
      const now=new Date();
      const ms=new Date(now.getFullYear(),now.getMonth(),1);
      const lms=new Date(now.getFullYear(),now.getMonth()-1,1);
      const ntm=en.filter(t=>new Date(t.created_at)>=ms).length;
      const nlm=en.filter(t=>{const d=new Date(t.created_at);return d>=lms&&d<ms;}).length;
      setKpi({totalTenants:en.length,activeTenants:en.filter(t=>t.is_active).length,suspendedTenants:en.filter(t=>!t.is_active).length,newThisMonth:ntm,totalStaff:(sd??[]).length,proTenants:en.filter(t=>t.plan==="pro").length,basicTenants:en.filter(t=>t.plan==="basic").length,freeTenants:en.filter(t=>t.plan==="free").length,tenantGrowth:nlm>0?Math.round(((ntm-nlm)/nlm)*100):ntm>0?100:0});
      setGd(Array.from({length:6},(_,i)=>{const d=new Date();d.setMonth(d.getMonth()-(5-i));const me=new Date(d.getFullYear(),d.getMonth()+1,0);return {month:MO[d.getMonth()],tenants:en.filter(t=>new Date(t.created_at)<=me).length};}));
    } finally { setLoading(false); setRefreshing(false); }
  },[]);

  useEffect(()=>{load();},[load]);

  const toggleStatus=async(t:Tenant)=>{setAl(true);await supabase.from("tenants").update({is_active:!t.is_active}).eq("id",t.id);await load();setSel(prev=>prev?{...prev,is_active:!t.is_active}:null);setAl(false);};
  const changePlan=async(t:Tenant,plan:"free"|"basic"|"pro")=>{setAl(true);await supabase.from("tenants").update({plan}).eq("id",t.id);await supabase.from("subscriptions").update({plan}).eq("tenant_id",t.id);await load();setSel(prev=>prev?{...prev,plan}:null);setAl(false);};
  const signOut=async()=>{await supabase.auth.signOut();navigate({to:"/login"});};

  const filtered=tenants.filter(t=>{const q=search.toLowerCase();return(!q||t.name.toLowerCase().includes(q)||t.email.toLowerCase().includes(q))&&(fp==="all"||t.plan===fp)&&(fs==="all"||(fs==="active"?t.is_active:!t.is_active));}).sort((a,b)=>{if(sortBy==="staff")return(b.staff_count??0)-(a.staff_count??0);if(sortBy==="orders")return(b.order_count??0)-(a.order_count??0);return new Date(b.created_at).getTime()-new Date(a.created_at).getTime();});
  const fstaff=allStaff.filter(s=>{const q=ss.toLowerCase();return !q||s.full_name?.toLowerCase().includes(q)||s.email?.toLowerCase().includes(q);});
  const pd=[{name:"Free",value:kpi?.freeTenants??0},{name:"Basic",value:kpi?.basicTenants??0},{name:"Pro",value:kpi?.proTenants??0}];
  const W=240;

  const sidebar=(
    <aside style={{width:`${W}px`,background:"#0f172a",display:"flex",flexDirection:"column",flexShrink:0,height:"100vh",...(isMobile?{position:"fixed" as any,left:sidebarOpen?0:`-${W}px`,top:0,zIndex:50,transition:"left 0.25s ease"}:{position:"sticky" as any,top:0})}}>
      <div style={{padding:"20px 20px 14px",borderBottom:"1px solid rgba(255,255,255,0.07)"}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:"10px"}}>
          <div style={{display:"flex",alignItems:"center",gap:"9px"}}>
            <div style={{background:"linear-gradient(135deg,#6366f1,#8b5cf6)",borderRadius:"8px",padding:"6px 8px"}}><Zap style={{width:"15px",height:"15px",color:"#fff"}} /></div>
            <span style={{color:"#fff",fontWeight:"800",fontSize:"15px"}}>PosifyPro</span>
          </div>
          {isMobile && <button onClick={()=>setSidebarOpen(false)} style={{background:"none",border:"none",cursor:"pointer",color:"#64748b"}}><X style={{width:"16px",height:"16px"}} /></button>}
        </div>
        <div style={{display:"inline-flex",alignItems:"center",gap:"5px",background:"linear-gradient(135deg,#f59e0b,#ef4444)",borderRadius:"99px",padding:"3px 10px",fontSize:"10px",fontWeight:"800",color:"#fff",letterSpacing:"1px"}}>
          <Shield style={{width:"9px",height:"9px"}} /> SUPER ADMIN
        </div>
      </div>
      <nav style={{flex:1,padding:"12px 10px",display:"flex",flexDirection:"column",gap:"2px"}}>
        {NAV.map(item=>{
          const active=tab===item.id;
          return (
            <button key={item.id} onClick={()=>{setTab(item.id as AdminTab);setSidebarOpen(false);}} style={{display:"flex",alignItems:"center",gap:"10px",padding:"10px 12px",borderRadius:"9px",border:"none",cursor:"pointer",background:active?"rgba(99,102,241,0.2)":"transparent",color:active?"#a5b4fc":"rgba(255,255,255,0.5)",fontWeight:active?"600":"400",fontSize:"13px",borderLeft:active?"2px solid #6366f1":"2px solid transparent",transition:"all 0.15s",textAlign:"left"}}>
              <item.icon style={{width:"16px",height:"16px",flexShrink:0}} />
              {item.l}
              {item.id==="tenants"&&kpi&&<span style={{marginLeft:"auto",background:"rgba(99,102,241,0.3)",color:"#a5b4fc",borderRadius:"99px",padding:"1px 7px",fontSize:"10px",fontWeight:"700"}}>{kpi.totalTenants}</span>}
            </button>
          );
        })}
      </nav>
      <div style={{padding:"12px 10px",borderTop:"1px solid rgba(255,255,255,0.07)"}}>
        <div style={{padding:"8px 12px",marginBottom:"4px"}}>
          <div style={{fontSize:"11px",color:"rgba(255,255,255,0.3)",marginBottom:"1px"}}>Signed in as</div>
          <div style={{fontSize:"12px",color:"rgba(255,255,255,0.6)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{user?.email}</div>
        </div>
        <button onClick={signOut} style={{display:"flex",alignItems:"center",gap:"8px",width:"100%",padding:"9px 12px",borderRadius:"9px",border:"none",cursor:"pointer",background:"rgba(239,68,68,0.12)",color:"#fca5a5",fontSize:"13px",fontWeight:"600"}}>
          <LogOut style={{width:"14px",height:"14px"}} /> Sign out
        </button>
      </div>
    </aside>
  );

  const topbar=(
    <div style={{background:"#0f172a",borderBottom:"1px solid rgba(255,255,255,0.07)",padding:"0 20px",height:"62px",display:"flex",alignItems:"center",justifyContent:"space-between",position:"sticky",top:0,zIndex:10,flexShrink:0}}>
      <div style={{display:"flex",alignItems:"center",gap:"12px"}}>
        <button onClick={()=>setSidebarOpen(o=>!o)} style={{background:"rgba(255,255,255,0.08)",border:"1px solid rgba(255,255,255,0.1)",borderRadius:"8px",padding:"7px 9px",cursor:"pointer",color:"#fff",display:"flex",alignItems:"center"}}>
          {sidebarOpen
            ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
          }
        </button>
        <div>
          <div style={{display:"flex",alignItems:"center",gap:"7px",marginBottom:"2px"}}>
            <span style={{color:"#fff",fontWeight:"800",fontSize:"14px"}}>⚡ PosifyPro</span>
            <span style={{background:"linear-gradient(135deg,#f59e0b,#ef4444)",borderRadius:"99px",padding:"1px 8px",fontSize:"9px",fontWeight:"800",color:"#fff"}}>SUPER ADMIN</span>
          </div>
          <div style={{fontSize:"10px",color:"rgba(255,255,255,0.35)",display:"flex",gap:"4px"}}>
            <span>{new Date().toLocaleDateString("en-KE",{weekday:"short",day:"numeric",month:"short",year:"numeric"})}</span>
            <span>·</span>
            <span>{new Date().toLocaleTimeString("en-KE",{hour:"2-digit",minute:"2-digit"})}</span>
            <span>·</span>
            <span style={{color:"#a5b4fc",fontWeight:"600"}}>{NAV.find(s=>s.id===tab)?.l}</span>
          </div>
        </div>
      </div>
      <div style={{display:"flex",alignItems:"center",gap:"8px"}}>
        <div style={{background:"rgba(16,185,129,0.15)",border:"1px solid rgba(16,185,129,0.3)",borderRadius:"8px",padding:"5px 11px",display:"flex",alignItems:"center",gap:"5px",fontSize:"11px",fontWeight:"600",color:"#34d399"}}>
          <span style={{width:"6px",height:"6px",borderRadius:"50%",background:"#34d399",display:"inline-block"}} />
          {kpi?.activeTenants??0} live
        </div>
        <button onClick={()=>{setRefreshing(true);load();}} style={{background:"rgba(255,255,255,0.08)",border:"1px solid rgba(255,255,255,0.1)",borderRadius:"8px",padding:"7px 9px",cursor:"pointer",color:"#94a3b8",display:"flex"}}>
          <RefreshCw style={{width:"14px",height:"14px",animation:refreshing?"spin 1s linear infinite":"none"}} />
        </button>
      </div>
    </div>
  );

  return (
    <div style={{display:"flex",minHeight:"100vh",background:"#f8fafc",fontFamily:"'DM Sans',system-ui,sans-serif"}}>
      {sidebarOpen && <div onClick={()=>setSidebarOpen(false)} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.4)",zIndex:40}} />}
      {sidebar}
      <div style={{flex:1,minWidth:0,display:"flex",flexDirection:"column"}}>
        {topbar}
        <div style={{flex:1,padding:"24px",overflowY:"auto"}}>

          {tab==="overview" && (
            <div style={{display:"flex",flexDirection:"column",gap:"22px"}}>
              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))",gap:"12px"}}>
                <KCard label="Total Businesses" value={String(kpi?.totalTenants??0)} icon={Building2} color="#6366f1" trend={kpi?.tenantGrowth} sub={`${kpi?.newThisMonth??0} new this month`} loading={loading} />
                <KCard label="Active" value={String(kpi?.activeTenants??0)} icon={CheckCircle2} color="#10b981" sub={`${kpi&&kpi.totalTenants?Math.round((kpi.activeTenants/kpi.totalTenants)*100):0}% of total`} loading={loading} />
                <KCard label="Suspended" value={String(kpi?.suspendedTenants??0)} icon={AlertTriangle} color="#ef4444" loading={loading} />
                <KCard label="Total Staff" value={String(kpi?.totalStaff??0)} icon={Users} color="#8b5cf6" sub="All businesses" loading={loading} />
                <KCard label="Pro Businesses" value={String(kpi?.proTenants??0)} icon={Crown} color="#f59e0b" sub={`${kpi?.basicTenants??0} on Basic`} loading={loading} />
                <KCard label="New This Month" value={String(kpi?.newThisMonth??0)} icon={TrendingUp} color="#3b82f6" trend={kpi?.tenantGrowth} loading={loading} />
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 300px",gap:"16px"}}>
                <div style={{background:"#fff",borderRadius:"14px",padding:"20px",border:"1px solid #f1f5f9"}}>
                  <h3 style={{margin:"0 0 4px",fontWeight:"700",fontSize:"13px",color:"#0f172a"}}>Business Growth</h3>
                  <p style={{margin:"0 0 16px",fontSize:"11px",color:"#94a3b8"}}>Cumulative — last 6 months</p>
                  <ResponsiveContainer width="100%" height={180}>
                    <AreaChart data={gd}>
                      <defs><linearGradient id="g1" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#6366f1" stopOpacity={0.15}/><stop offset="95%" stopColor="#6366f1" stopOpacity={0}/></linearGradient></defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9"/>
                      <XAxis dataKey="month" tick={{fontSize:10,fill:"#94a3b8"}} axisLine={false} tickLine={false}/>
                      <YAxis tick={{fontSize:10,fill:"#94a3b8"}} axisLine={false} tickLine={false}/>
                      <Tooltip content={<CT />}/>
                      <Area type="monotone" dataKey="tenants" stroke="#6366f1" strokeWidth={2.5} fill="url(#g1)" name="Businesses"/>
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
                <div style={{background:"#fff",borderRadius:"14px",padding:"20px",border:"1px solid #f1f5f9"}}>
                  <h3 style={{margin:"0 0 4px",fontWeight:"700",fontSize:"13px",color:"#0f172a"}}>New Signups / Month</h3>
                  <p style={{margin:"0 0 16px",fontSize:"11px",color:"#94a3b8"}}>Businesses joined per month</p>
                  <ResponsiveContainer width="100%" height={180}>
                    <BarChart data={gd.map((d,i,a)=>({month:d.month,new:i===0?d.tenants:d.tenants-a[i-1].tenants}))} barSize={24}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9"/>
                      <XAxis dataKey="month" tick={{fontSize:10,fill:"#94a3b8"}} axisLine={false} tickLine={false}/>
                      <YAxis tick={{fontSize:10,fill:"#94a3b8"}} axisLine={false} tickLine={false} allowDecimals={false}/>
                      <Tooltip content={<CT />}/>
                      <Bar dataKey="new" fill="#10b981" radius={[4,4,0,0]} name="New"/>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div style={{background:"#fff",borderRadius:"14px",padding:"20px",border:"1px solid #f1f5f9"}}>
                  <h3 style={{margin:"0 0 4px",fontWeight:"700",fontSize:"13px",color:"#0f172a"}}>Plan Split</h3>
                  <p style={{margin:"0 0 12px",fontSize:"11px",color:"#94a3b8"}}>Subscription distribution</p>
                  <ResponsiveContainer width="100%" height={120}>
                    <PieChart><Pie data={pd} cx="50%" cy="50%" innerRadius={38} outerRadius={55} paddingAngle={3} dataKey="value">{pd.map((_,i)=><Cell key={i} fill={PCOLS[i]}/>)}</Pie><Tooltip/></PieChart>
                  </ResponsiveContainer>
                  <div style={{display:"flex",flexDirection:"column",gap:"6px",marginTop:"8px"}}>
                    {pd.map((p,i)=>(
                      <div key={p.name} style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                        <div style={{display:"flex",alignItems:"center",gap:"6px"}}>
                          <span style={{width:"8px",height:"8px",borderRadius:"2px",background:PCOLS[i],display:"inline-block"}}/>
                          <span style={{fontSize:"12px",color:"#64748b"}}>{p.name}</span>
                        </div>
                        <span style={{fontSize:"12px",fontWeight:"700",color:"#0f172a"}}>{p.value} ({kpi?.totalTenants?Math.round((p.value/kpi.totalTenants)*100):0}%)</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <div style={{background:"#fff",borderRadius:"14px",padding:"20px",border:"1px solid #f1f5f9"}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"16px"}}>
                  <h3 style={{margin:0,fontWeight:"700",fontSize:"13px",color:"#0f172a"}}>Recently Joined</h3>
                  <button onClick={()=>setTab("tenants")} style={{display:"flex",alignItems:"center",gap:"3px",fontSize:"12px",color:"#6366f1",fontWeight:"600",background:"none",border:"none",cursor:"pointer"}}>
                    View all <ChevronRight style={{width:"13px",height:"13px"}}/>
                  </button>
                </div>
                <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(240px,1fr))",gap:"10px"}}>
                  {tenants.slice(0,6).map(t=>(
                    <div key={t.id} onClick={()=>{setSel(t);setTab("tenants");}} style={{border:"1px solid #f1f5f9",borderRadius:"12px",padding:"14px",cursor:"pointer",transition:"all 0.15s"}} onMouseEnter={e=>{(e.currentTarget as HTMLElement).style.borderColor="#c7d2fe";}} onMouseLeave={e=>{(e.currentTarget as HTMLElement).style.borderColor="#f1f5f9";}}>
                      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:"8px"}}>
                        <div style={{width:"34px",height:"34px",borderRadius:"9px",background:"linear-gradient(135deg,#6366f1,#8b5cf6)",display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontWeight:"800",fontSize:"14px"}}>{t.name.charAt(0).toUpperCase()}</div>
                        <Badge plan={t.plan}/>
                      </div>
                      <div style={{fontWeight:"700",fontSize:"13px",color:"#0f172a"}}>{t.name}</div>
                      <div style={{fontSize:"11px",color:"#94a3b8",marginBottom:"8px"}}>{t.email}</div>
                      <div style={{display:"flex",gap:"12px",fontSize:"11px",color:"#64748b"}}>
                        <span>👥 {t.staff_count}</span><span>🧾 {t.order_count}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {tab==="tenants" && (
            <div style={{display:"flex",flexDirection:"column",gap:"16px"}}>
              <div style={{display:"flex",gap:"8px",flexWrap:"wrap",alignItems:"center"}}>
                <div style={{position:"relative",flex:1,minWidth:"200px"}}>
                  <Search style={{position:"absolute",left:"10px",top:"50%",transform:"translateY(-50%)",width:"14px",height:"14px",color:"#94a3b8"}}/>
                  <input placeholder="Search..." value={search} onChange={e=>setSearch(e.target.value)} style={{width:"100%",padding:"8px 12px 8px 32px",borderRadius:"9px",border:"1.5px solid #e2e8f0",fontSize:"13px",outline:"none",boxSizing:"border-box",background:"#fff"}}/>
                </div>
                {(["all","free","basic","pro"] as const).map(p=>(
                  <button key={p} onClick={()=>setFp(p)} style={{padding:"7px 13px",borderRadius:"99px",border:"1.5px solid",borderColor:fp===p?"#6366f1":"#e2e8f0",background:fp===p?"#6366f1":"#fff",color:fp===p?"#fff":"#64748b",fontSize:"12px",fontWeight:"600",cursor:"pointer",textTransform:"capitalize"}}>{p==="all"?"All Plans":p}</button>
                ))}
                {(["all","active","suspended"] as const).map(s=>(
                  <button key={s} onClick={()=>setFs(s)} style={{padding:"7px 13px",borderRadius:"99px",border:"1.5px solid",borderColor:fs===s?"#0f172a":"#e2e8f0",background:fs===s?"#0f172a":"#fff",color:fs===s?"#fff":"#64748b",fontSize:"12px",fontWeight:"600",cursor:"pointer",textTransform:"capitalize"}}>{s==="all"?"All Status":s}</button>
                ))}
                <select value={sortBy} onChange={e=>setSortBy(e.target.value as any)} style={{padding:"7px 11px",borderRadius:"9px",border:"1.5px solid #e2e8f0",fontSize:"12px",color:"#64748b",background:"#fff",outline:"none"}}>
                  <option value="newest">Newest first</option>
                  <option value="staff">Most staff</option>
                  <option value="orders">Most orders</option>
                </select>
              </div>
              <div style={{background:"#fff",borderRadius:"14px",border:"1px solid #f1f5f9",overflow:"hidden"}}>
                <div style={{display:"grid",gridTemplateColumns:"2fr 1.5fr 70px 80px 110px 100px",padding:"11px 20px",background:"#f8fafc",borderBottom:"1px solid #f1f5f9",fontSize:"10px",fontWeight:"700",color:"#94a3b8",textTransform:"uppercase",letterSpacing:"0.5px"}}>
                  <span>Business</span><span>Contact</span><span>Staff</span><span>Orders</span><span>Plan</span><span>Status</span>
                </div>
                {loading ? <div style={{padding:"40px",textAlign:"center",color:"#94a3b8"}}>Loading…</div>
                : filtered.length===0 ? <div style={{padding:"50px",textAlign:"center",color:"#94a3b8"}}>No businesses found</div>
                : filtered.map((t,i)=>(
                  <div key={t.id} onClick={()=>setSel(sel?.id===t.id?null:t)} style={{display:"grid",gridTemplateColumns:"2fr 1.5fr 70px 80px 110px 100px",padding:"13px 20px",cursor:"pointer",alignItems:"center",borderBottom:i<filtered.length-1?"1px solid #f8fafc":"none",background:sel?.id===t.id?"#f5f3ff":"transparent",transition:"background 0.1s",opacity:t.is_active?1:0.6}} onMouseEnter={e=>{if(sel?.id!==t.id)(e.currentTarget as HTMLElement).style.background="#f8fafc";}} onMouseLeave={e=>{if(sel?.id!==t.id)(e.currentTarget as HTMLElement).style.background="transparent";}}>
                    <div style={{display:"flex",alignItems:"center",gap:"10px"}}>
                      <div style={{width:"32px",height:"32px",borderRadius:"8px",flexShrink:0,background:"linear-gradient(135deg,#6366f1,#8b5cf6)",display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontWeight:"800",fontSize:"12px"}}>{t.name.charAt(0).toUpperCase()}</div>
                      <div><div style={{fontWeight:"600",fontSize:"13px",color:"#0f172a"}}>{t.name}</div><div style={{fontSize:"10px",color:"#94a3b8"}}>/{t.slug}</div></div>
                    </div>
                    <div style={{fontSize:"12px",color:"#64748b",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{t.email}</div>
                    <div style={{fontSize:"13px",fontWeight:"600",color:"#0f172a"}}>{t.staff_count}</div>
                    <div style={{fontSize:"13px",fontWeight:"600",color:"#0f172a"}}>{t.order_count}</div>
                    <Badge plan={t.plan}/>
                    <div style={{display:"flex",alignItems:"center",gap:"5px",fontSize:"11px",fontWeight:"600",color:t.is_active?"#10b981":"#ef4444"}}>
                      <span style={{width:"6px",height:"6px",borderRadius:"50%",background:t.is_active?"#10b981":"#ef4444",display:"inline-block"}}/>
                      {t.is_active?"Active":"Suspended"}
                    </div>
                  </div>
                ))}
              </div>
              {sel && (
                <div style={{background:"#fff",borderRadius:"14px",border:"1px solid #e0e7ff",padding:"20px"}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:"16px"}}>
                    <div style={{display:"flex",alignItems:"center",gap:"12px"}}>
                      <div style={{width:"42px",height:"42px",borderRadius:"11px",background:"linear-gradient(135deg,#6366f1,#8b5cf6)",display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontWeight:"800",fontSize:"17px"}}>{sel.name.charAt(0)}</div>
                      <div><div style={{fontWeight:"800",fontSize:"15px",color:"#0f172a"}}>{sel.name}</div><div style={{fontSize:"12px",color:"#94a3b8"}}>{sel.email}</div></div>
                    </div>
                    <button onClick={()=>setSel(null)} style={{background:"none",border:"none",cursor:"pointer",color:"#94a3b8"}}><X style={{width:"17px",height:"17px"}}/></button>
                  </div>
                  <div style={{display:"flex",gap:"12px",marginBottom:"18px",flexWrap:"wrap"}}>
                    {[{l:"Staff",v:sel.staff_count,e:"👥"},{l:"Orders",v:sel.order_count,e:"🧾"},{l:"Currency",v:sel.currency,e:"🌍"},{l:"Slug",v:`/${sel.slug}`,e:"🔗"}].map(s=>(
                      <div key={s.l} style={{background:"#f8fafc",borderRadius:"10px",padding:"11px 15px",flex:1,minWidth:"90px"}}>
                        <div style={{fontSize:"16px",marginBottom:"3px"}}>{s.e}</div>
                        <div style={{fontWeight:"700",fontSize:"15px",color:"#0f172a"}}>{s.v}</div>
                        <div style={{fontSize:"10px",color:"#94a3b8"}}>{s.l}</div>
                      </div>
                    ))}
                  </div>
                  <div style={{display:"flex",gap:"8px",flexWrap:"wrap",alignItems:"center"}}>
                    <span style={{fontSize:"12px",fontWeight:"600",color:"#64748b"}}>Change Plan:</span>
                    {(["free","basic","pro"] as const).map(p=>(
                      <button key={p} onClick={()=>changePlan(sel,p)} disabled={al||sel.plan===p} style={{padding:"7px 15px",borderRadius:"8px",border:"none",fontWeight:"600",fontSize:"12px",cursor:"pointer",background:sel.plan===p?PC[p].c:PC[p].bg,color:sel.plan===p?"#fff":PC[p].c,opacity:al?0.6:1,textTransform:"capitalize"}}>{sel.plan===p?`✓ ${p}`:p}</button>
                    ))}
                    <div style={{flex:1}}/>
                    <button onClick={()=>toggleStatus(sel)} disabled={al} style={{padding:"8px 18px",borderRadius:"8px",border:"none",fontWeight:"600",fontSize:"13px",cursor:"pointer",background:sel.is_active?"#fef2f2":"#f0fdf4",color:sel.is_active?"#ef4444":"#16a34a",opacity:al?0.6:1,display:"flex",alignItems:"center",gap:"6px"}}>
                      {sel.is_active?<><XCircle style={{width:"13px",height:"13px"}}/>Suspend</>:<><CheckCircle2 style={{width:"13px",height:"13px"}}/>Activate</>}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {tab==="analytics" && (
            <div style={{display:"flex",flexDirection:"column",gap:"20px"}}>
              <div style={{background:"#fff",borderRadius:"14px",padding:"22px",border:"1px solid #f1f5f9"}}>
                <h3 style={{margin:"0 0 4px",fontWeight:"700",fontSize:"14px",color:"#0f172a"}}>Business Growth Trend</h3>
                <p style={{margin:"0 0 18px",fontSize:"12px",color:"#94a3b8"}}>Cumulative businesses — last 6 months</p>
                <ResponsiveContainer width="100%" height={240}>
                  <AreaChart data={gd}>
                    <defs><linearGradient id="g2" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#6366f1" stopOpacity={0.12}/><stop offset="95%" stopColor="#6366f1" stopOpacity={0}/></linearGradient></defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9"/>
                    <XAxis dataKey="month" tick={{fontSize:11,fill:"#94a3b8"}} axisLine={false} tickLine={false}/>
                    <YAxis tick={{fontSize:11,fill:"#94a3b8"}} axisLine={false} tickLine={false} allowDecimals={false}/>
                    <Tooltip content={<CT />}/>
                    <Area type="monotone" dataKey="tenants" stroke="#6366f1" strokeWidth={2.5} fill="url(#g2)" name="Businesses"/>
                  </AreaChart>
                </ResponsiveContainer>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"16px"}}>
                <div style={{background:"#fff",borderRadius:"14px",padding:"20px",border:"1px solid #f1f5f9"}}>
                  <h3 style={{margin:"0 0 16px",fontWeight:"700",fontSize:"13px",color:"#0f172a"}}>Top Businesses by Orders</h3>
                  {[...tenants].sort((a,b)=>(b.order_count??0)-(a.order_count??0)).slice(0,6).map((t,i)=>{
                    const mx=tenants[0]?.order_count??1;
                    const pct=mx>0?Math.round(((t.order_count??0)/mx)*100):0;
                    return (
                      <div key={t.id} style={{marginBottom:"12px"}}>
                        <div style={{display:"flex",justifyContent:"space-between",marginBottom:"4px"}}>
                          <div style={{display:"flex",alignItems:"center",gap:"6px"}}>
                            <span style={{fontSize:"11px",color:"#94a3b8",width:"14px"}}>#{i+1}</span>
                            <span style={{fontSize:"13px",fontWeight:"600",color:"#0f172a"}}>{t.name}</span>
                            <Badge plan={t.plan}/>
                          </div>
                          <span style={{fontSize:"12px",fontWeight:"700",color:"#0f172a"}}>{t.order_count} orders</span>
                        </div>
                        <div style={{background:"#f1f5f9",borderRadius:"99px",height:"5px"}}>
                          <div style={{width:`${pct}%`,height:"5px",borderRadius:"99px",background:"linear-gradient(90deg,#6366f1,#8b5cf6)"}}/>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"10px",alignContent:"start"}}>
                  {[{l:"Avg Staff/Business",v:kpi&&kpi.totalTenants>0?(kpi.totalStaff/kpi.totalTenants).toFixed(1):"0"},{l:"Paid Conversion",v:`${kpi&&kpi.totalTenants>0?Math.round(((kpi.proTenants+kpi.basicTenants)/kpi.totalTenants)*100):0}%`},{l:"Suspension Rate",v:`${kpi&&kpi.totalTenants>0?Math.round((kpi.suspendedTenants/kpi.totalTenants)*100):0}%`},{l:"Pro Rate",v:`${kpi&&kpi.totalTenants>0?Math.round((kpi.proTenants/kpi.totalTenants)*100):0}%`}].map(s=>(
                    <div key={s.l} style={{background:"#fff",borderRadius:"12px",padding:"16px",border:"1px solid #f1f5f9"}}>
                      <div style={{fontSize:"22px",fontWeight:"800",color:"#0f172a"}}>{s.v}</div>
                      <div style={{fontSize:"11px",color:"#94a3b8",marginTop:"4px"}}>{s.l}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {tab==="staff" && (
            <div style={{display:"flex",flexDirection:"column",gap:"16px"}}>
              <div style={{position:"relative",maxWidth:"360px"}}>
                <Search style={{position:"absolute",left:"10px",top:"50%",transform:"translateY(-50%)",width:"14px",height:"14px",color:"#94a3b8"}}/>
                <input placeholder="Search staff..." value={ss} onChange={e=>setSs(e.target.value)} style={{width:"100%",padding:"8px 12px 8px 32px",borderRadius:"9px",border:"1.5px solid #e2e8f0",fontSize:"13px",outline:"none",boxSizing:"border-box"}}/>
              </div>
              <div style={{background:"#fff",borderRadius:"14px",border:"1px solid #f1f5f9",overflow:"hidden"}}>
                <div style={{display:"grid",gridTemplateColumns:"2fr 1.5fr 120px 120px",padding:"11px 20px",background:"#f8fafc",borderBottom:"1px solid #f1f5f9",fontSize:"10px",fontWeight:"700",color:"#94a3b8",textTransform:"uppercase",letterSpacing:"0.5px"}}>
                  <span>Staff Member</span><span>Business</span><span>Role</span><span>Status</span>
                </div>
                {fstaff.length===0 ? <div style={{padding:"50px",textAlign:"center",color:"#94a3b8"}}>No staff found</div>
                : fstaff.map((s,i)=>{
                  const rc=RC[s.role]??RC.cashier;
                  const RI=rc.icon;
                  return (
                    <div key={s.id} style={{display:"grid",gridTemplateColumns:"2fr 1.5fr 120px 120px",padding:"12px 20px",alignItems:"center",borderBottom:i<fstaff.length-1?"1px solid #f8fafc":"none"}}>
                      <div style={{display:"flex",alignItems:"center",gap:"10px"}}>
                        <div style={{width:"32px",height:"32px",borderRadius:"99px",background:rc.bg,display:"flex",alignItems:"center",justifyContent:"center",color:rc.color,fontWeight:"800",fontSize:"12px"}}>{s.full_name?.charAt(0)?.toUpperCase()??"?"}</div>
                        <div><div style={{fontWeight:"600",fontSize:"13px",color:"#0f172a"}}>{s.full_name}</div><div style={{fontSize:"11px",color:"#94a3b8"}}>{s.email}</div></div>
                      </div>
                      <div style={{fontSize:"12px",color:"#64748b"}}>{(s.tenants as any)?.name??"—"}</div>
                      <span style={{display:"inline-flex",alignItems:"center",gap:"5px",background:rc.bg,color:rc.color,padding:"3px 9px",borderRadius:"99px",fontSize:"11px",fontWeight:"700"}}>
                        <RI style={{width:"10px",height:"10px"}}/>
                        {s.role?.charAt(0).toUpperCase()+s.role?.slice(1)}
                      </span>
                      <div style={{display:"flex",alignItems:"center",gap:"5px",fontSize:"11px",fontWeight:"600",color:s.is_active?"#10b981":"#ef4444"}}>
                        <span style={{width:"6px",height:"6px",borderRadius:"50%",background:s.is_active?"#10b981":"#ef4444",display:"inline-block"}}/>
                        {s.is_active?"Active":"Suspended"}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {tab==="licenses" && <LicenseManager adminId={user?.id??""}/>}

          {tab==="activity" && (
            <div style={{display:"flex",flexDirection:"column",gap:"16px"}}>
              <div style={{background:"#fff",borderRadius:"14px",padding:"22px",border:"1px solid #f1f5f9"}}>
                <h3 style={{margin:"0 0 16px",fontWeight:"700",fontSize:"14px",color:"#0f172a"}}>Recent Business Signups</h3>
                {tenants.slice(0,15).map((t,i)=>(
                  <div key={t.id} style={{display:"flex",alignItems:"center",gap:"12px",padding:"12px 0",borderBottom:i<14?"1px solid #f8fafc":"none"}}>
                    <div style={{width:"36px",height:"36px",borderRadius:"9px",flexShrink:0,background:"linear-gradient(135deg,#6366f1,#8b5cf6)",display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontWeight:"800",fontSize:"13px"}}>{t.name.charAt(0).toUpperCase()}</div>
                    <div style={{flex:1}}><div style={{fontSize:"13px",fontWeight:"600",color:"#0f172a"}}><strong>{t.name}</strong> joined PosifyPro</div><div style={{fontSize:"11px",color:"#94a3b8"}}>{t.email}</div></div>
                    <Badge plan={t.plan}/>
                    <div style={{fontSize:"11px",color:"#94a3b8",whiteSpace:"nowrap"}}>{new Date(t.created_at).toLocaleDateString("en-KE",{day:"numeric",month:"short",year:"numeric"})}</div>
                  </div>
                ))}
                {tenants.length===0 && <div style={{padding:"40px",textAlign:"center",color:"#94a3b8"}}>No activity yet</div>}
              </div>
            </div>
          )}

          {tab==="settings" && (
            <div style={{display:"flex",flexDirection:"column",gap:"16px",maxWidth:"540px"}}>
              <div style={{background:"#fff",borderRadius:"14px",padding:"24px",border:"1px solid #f1f5f9"}}>
                <h3 style={{margin:"0 0 18px",fontWeight:"700",fontSize:"14px",color:"#0f172a"}}>Admin Account</h3>
                {[{l:"Email",v:user?.email??"—"},{l:"Role",v:"Super Admin"},{l:"Platform",v:"PosifyPro v2.0"}].map(r=>(
                  <div key={r.l} style={{display:"flex",justifyContent:"space-between",padding:"10px 14px",background:"#f8fafc",borderRadius:"9px",marginBottom:"8px"}}>
                    <span style={{fontSize:"13px",color:"#64748b"}}>{r.l}</span>
                    <span style={{fontSize:"13px",fontWeight:"600",color:"#0f172a"}}>{r.v}</span>
                  </div>
                ))}
              </div>
              <div style={{background:"#fff",borderRadius:"14px",padding:"24px",border:"1px solid #f1f5f9"}}>
                <h3 style={{margin:"0 0 18px",fontWeight:"700",fontSize:"14px",color:"#0f172a"}}>Platform Stats</h3>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"10px"}}>
                  {[{l:"Total Businesses",v:kpi?.totalTenants??0},{l:"Active",v:kpi?.activeTenants??0},{l:"Total Staff",v:kpi?.totalStaff??0},{l:"Pro Subscribers",v:kpi?.proTenants??0}].map(s=>(
                    <div key={s.l} style={{background:"#f8fafc",borderRadius:"9px",padding:"14px"}}>
                      <div style={{fontSize:"20px",fontWeight:"800",color:"#0f172a"}}>{s.v}</div>
                      <div style={{fontSize:"11px",color:"#94a3b8",marginTop:"2px"}}>{s.l}</div>
                    </div>
                  ))}
                </div>
              </div>
              <button onClick={signOut} style={{display:"flex",alignItems:"center",justifyContent:"center",gap:"8px",padding:"12px",borderRadius:"10px",border:"none",cursor:"pointer",background:"#fef2f2",color:"#ef4444",fontWeight:"700",fontSize:"14px"}}>
                <LogOut style={{width:"16px",height:"16px"}}/> Sign out of Admin
              </button>
            </div>
          )}

        </div>
      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}