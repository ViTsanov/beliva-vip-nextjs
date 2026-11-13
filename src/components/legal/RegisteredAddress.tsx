import { COMPANY_INFO } from "@/lib/companyInfo";

// Седалището и адресът на управление за Общите условия и Политиката за поверителност.
// Докато COMPANY_INFO.registeredAddress е празно, показваме обичайния адрес, а в режим на разработка —
// и предупреждение, за да се вижда, че законово задължителното поле още липсва.
export default function RegisteredAddress() {
  if (COMPANY_INFO.registeredAddress) return <>{COMPANY_INFO.registeredAddress}</>;
  return (
    <>
      {COMPANY_INFO.address}
      {process.env.NODE_ENV === "development" && (
        <span className="ml-2 rounded bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-800">
          Чернова: попълни registeredAddress в companyInfo.ts
        </span>
      )}
    </>
  );
}
