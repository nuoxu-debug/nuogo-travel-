export default function BrandLogo({
  variant = "mark",
  small = false,
  className = ""
}) {
  if (variant === "full") {
    return (
      <img
        src="/nuogo-logo.png"
        alt="Nuogo logo"
        className={`block object-contain ${className}`}
      />
    );
  }

  return (
    <span
      className={`nuogo-brand-mark ${small ? "nuogo-brand-mark-small" : ""} ${className}`}
    >
      <img src="/nuogo-logo.png" alt="Nuogo logo" />
    </span>
  );
}
