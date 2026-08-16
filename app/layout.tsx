import "./globals.css";
import "./activity.css";
import "./status-rules.css";
import "./expense.css";
import "./officers.css";
import "./team.css";
import "./team-actions.css";
import "./mobile-nav.css";
import "./progress.css";
import "./references.css";
import "./repair-breakdown.css";
import "./tools.css";
import "./payment.css";
import "./reports.css";
import { StatusChangeGuard } from "@/components/status-change-guard";
export const metadata={title:"Opname PDAM",description:"Sistem pencatatan opname pekerjaan PDAM Tirta Amertha Buana",icons:{icon:"/brand/tirta-amertha-buana.webp"}};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="id"><body><StatusChangeGuard/>{children}</body></html>}
