import Link from 'next/link';

type Props = {
  subtitle: string;
};

/** Sticky header matching the Gym Flow PWA chrome (wordmark + accent). */
export function GymFlowAuthHeader({ subtitle }: Props) {
  return (
    <header className="gym-flow-auth-header-bar">
      <div className="gym-flow-auth-header-inner">
        <Link href="/gym-flow/" className="gym-flow-auth-brand">
          <div>
            <p className="gym-flow-auth-wordmark">Gym Flow</p>
            <p className="gym-flow-auth-brand-sub">{subtitle}</p>
          </div>
        </Link>
      </div>
    </header>
  );
}
