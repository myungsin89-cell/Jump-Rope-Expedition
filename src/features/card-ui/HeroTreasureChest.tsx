import './cards.css';

export default function HeroTreasureChest({ className = '' }: { className?: string }) {
  return (
    <span className={`hero-treasure-chest ${className}`.trim()} aria-hidden="true">
      <i className="hero-treasure-spark hero-treasure-spark-one">✦</i>
      <i className="hero-treasure-spark hero-treasure-spark-two">✧</i>
      <span className="hero-treasure-light" />
      <span className="hero-treasure-lid">
        <i />
      </span>
      <span className="hero-treasure-body">
        <i className="hero-treasure-lock" />
      </span>
    </span>
  );
}
