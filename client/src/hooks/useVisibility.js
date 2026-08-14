import { useEffect, useState } from "react";

export function useVisibility(targetRef) {
  const [intersecting, setIntersecting] = useState(false);
  const [documentVisible, setDocumentVisible] = useState(() => (
    typeof document === "undefined" || document.visibilityState !== "hidden"
  ));

  useEffect(() => {
    const target = targetRef.current;
    if (!target) return undefined;
    if (typeof IntersectionObserver !== "function") {
      setIntersecting(true);
      return undefined;
    }

    const observer = new IntersectionObserver(([entry]) => {
      setIntersecting(Boolean(entry?.isIntersecting));
    }, { rootMargin: "160px 0px" });
    observer.observe(target);
    return () => observer.disconnect();
  }, [targetRef]);

  useEffect(() => {
    if (typeof document === "undefined") return undefined;
    const handleVisibility = () => setDocumentVisible(document.visibilityState !== "hidden");
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, []);

  return intersecting && documentVisible;
}
