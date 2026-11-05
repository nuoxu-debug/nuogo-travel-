import { useEffect, useRef, useState } from "react";
import { Clock3, X } from "lucide-react";
import flatpickr from "flatpickr";
import { Mandarin } from "flatpickr/dist/l10n/zh.js";
import "flatpickr/dist/flatpickr.css";
import "./LocalTimeInput.css";

export default function LocalTimeInput({ label, language, value = "", onChange }) {
  const inputRef = useRef(null);
  const pickerRef = useRef(null);
  const changeRef = useRef(onChange);
  const [open, setOpen] = useState(false);
  changeRef.current = onChange;
  const zh = language === "zh";
  const openLabel = `${zh ? "\u9009\u62e9\u65f6\u95f4\uff1a" : "Choose time: "}${label}`;
  const clearLabel = `${zh ? "\u6e05\u7a7a\uff1a" : "Clear: "}${label}`;

  useEffect(() => {
    const picker = flatpickr(inputRef.current, {
      enableTime: true,
      noCalendar: true,
      time_24hr: true,
      minuteIncrement: 1,
      allowInput: true,
      disableMobile: true,
      dateFormat: "H:i",
      locale: language === "zh" ? Mandarin : "en",
      onReady: (_dates, _text, instance) => {
        instance.calendarContainer.classList.add("nuogo-time-picker");
        instance.calendarContainer.setAttribute("role", "dialog");
        instance.calendarContainer.setAttribute("aria-label", openLabel);
      },
      onOpen: () => {
        inputRef.current.scrollIntoView?.({ block: "center", behavior: "instant" });
        setOpen(true);
      },
      onClose: () => setOpen(false),
      onChange: (_dates, text) => changeRef.current(text)
    });
    pickerRef.current = picker;
    setOpen(false);
    return () => { picker.destroy(); pickerRef.current = null; };
  }, [language, openLabel]);

  useEffect(() => {
    if (inputRef.current.value !== value) pickerRef.current?.setDate(value, false);
  }, [value, language]);

  return <span className="local-time-input">
    <input
      ref={inputRef}
      type="text"
      className="field-control"
      aria-label={label}
      lang={zh ? "zh-CN" : "en"}
      placeholder={zh ? "\u65f6:\u5206" : "HH:mm"}
      pattern="([01][0-9]|2[0-3]):[0-5][0-9]"
      autoComplete="off"
      onChange={(event) => onChange(event.target.value)}
    />
    <span className="local-time-actions">
      {value && <button type="button" aria-label={clearLabel} title={clearLabel} onClick={() => pickerRef.current?.clear()}><X aria-hidden="true" /></button>}
      <button type="button" aria-label={openLabel} title={openLabel} aria-haspopup="dialog" aria-expanded={open} onClick={() => pickerRef.current?.toggle()}><Clock3 aria-hidden="true" /></button>
    </span>
  </span>;
}
