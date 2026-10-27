import { HomeJoinQr } from '@/components/customer/home-join-qr';

export default function HomePage() {
  return (
    <div className="booking-dark flex min-h-full flex-1 flex-col">
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col px-5 py-8">
        <HomeJoinQr />
      </main>
    </div>
  );
}
