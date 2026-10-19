// Структурирани данни (schema.org) за Google. „<“ се записва като < — така текст от базата (заглавие на тур,
// статия) никога не може да затвори <script> тага преждевременно и да счупи HTML-а след него. JSON-ът остава същият.
export default function JsonLd({ data }: { data: unknown }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, '\\u003c') }}
    />
  );
}
