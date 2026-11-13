import Link from "next/link";
import Image from "next/image";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { ShieldCheck } from "lucide-react";

export const metadata = {
  title: "Agent Registration | Ghar Safar",
};

export default function AgentRegisterPage() {
  return (
    <div className="min-h-[calc(100vh-160px)] flex items-center justify-center px-4 py-12">
      <Card className="w-full max-w-md shadow-xl border-slate-200 dark:border-slate-800 text-center">
        <CardHeader className="space-y-3">
          <Image
            src="/images/ghar-safar-logo.png"
            alt="Ghar Safar logo"
            width={50}
            height={48}
            className="mx-auto h-12 w-12 object-contain"
          />
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 dark:bg-emerald-950">
            <ShieldCheck className="h-7 w-7 text-emerald-600" />
          </div>
          <CardTitle className="text-xl font-bold">Agent Accounts by Invite Only</CardTitle>
          <CardDescription>
            Estate agent and agency accounts are created by the platform administrator. If you are
            an agent, please contact your administrator to have your account set up.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Link
            href="/login"
            className="flex w-full items-center justify-center h-11 rounded-md bg-emerald-600 px-4 font-semibold text-sm text-white hover:bg-emerald-500 transition-colors"
          >
            Sign In to Your Account
          </Link>
          <p className="text-xs text-slate-500">
            Looking to buy or invest?{" "}
            <Link href="/auth/register" className="font-semibold text-emerald-600 hover:underline">
              Create a Buyer Account
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
