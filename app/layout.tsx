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
export const metadata={title:"WMS PDAM",description:"Sistem manajemen gudang internal PDAM"};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="id"><body><StatusChangeGuard/>{children}</body></html>}
