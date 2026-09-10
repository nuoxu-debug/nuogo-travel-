import { publicAssetPath } from "../assets.js";

export default function BrandLogo({
  variant = "mark",
  small = false,
  className = ""
}) {
  const logo = publicAssetPath("/nuogo-logo.png");

  if (variant === "full") {
    return (
      <img
        src={logo}
        alt="Nuogo logo"
        className={`block object-contain ${className}`}
      />
    );
  }

  return (
    <span
      className={`nuogo-brand-mark ${small ? "nuogo-brand-mark-small" : ""} ${className}`}
    >
      <img src={logo} alt="Nuogo logo" />
    </span>
  );
}
