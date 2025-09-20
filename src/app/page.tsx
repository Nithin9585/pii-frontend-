import { RedactlyApp } from "@/components/redactly/redactly-app";
import { Logo } from "@/components/icons/logo";

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen">
      <header className="py-4 px-4 sm:px-6 md:px-8 border-b">
        <div className="flex items-center gap-2">
          <Logo className="h-8 w-8 text-primary" />
          <h1 className="text-2xl font-bold tracking-tighter">Redactly</h1>
        </div>
      </header>
      <main className="flex-1 flex flex-col items-center justify-start p-4 sm:p-6 md:p-8">
        <div className="w-full max-w-6xl mx-auto flex flex-col items-center text-center my-12">
          <div className="relative mb-4">
             <h2 className="text-4xl md:text-5xl font-extrabold tracking-tighter text-focus-in">
              Automated Document Analysis
            </h2>
            <div className="mt-2 text-2xl md:text-3xl font-semibold text-muted-foreground">
              <span className="inline-block animate-fadeIn" style={{ animationDelay: '0.5s' }}>OCR</span>
              <span className="mx-2 inline-block animate-fadeIn" style={{ animationDelay: '0.6s' }}>,</span>
              <span className="inline-block animate-fadeIn" style={{ animationDelay: '0.7s' }}>Signatures</span>
              <span className="mx-2 inline-block animate-fadeIn" style={{ animationDelay: '0.8s' }}>&</span>
              <span className="inline-block animate-fadeIn text-primary" style={{ animationDelay: '0.9s' }}>PII Detection</span>
            </div>
          </div>

          <p className="max-w-2xl text-muted-foreground md:text-lg animate-fadeIn" style={{ animationDelay: '1s' }}>
            Upload your documents and let our AI handle the heavy lifting. We identify sensitive data, so you can redact with confidence.
          </p>
        </div>
        <div className="w-full max-w-7xl mx-auto flex-1 mb-12">
          <RedactlyApp />
        </div>
      </main>
    </div>
  );
}
