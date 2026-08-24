import { PageShell } from '@/components/layout/page-shell';
import { HomeJoinQr } from '@/components/customer/home-join-qr';

export default function HomePage() {
  return (
    <PageShell gradient>
      <div className="flex flex-1 flex-col items-center justify-center gap-8 py-8 animate-fade-in-up">
        <HomeJoinQr />
      </div>
    </PageShell>
  );
}
