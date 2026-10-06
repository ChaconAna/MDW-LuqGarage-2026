import { signIn } from "@/auth";

export default function Home() {
  return (
    <main className="mx-auto max-w-2xl p-8">
      <h1 className="text-2xl font-bold">LuqGarage</h1>
      <p className="mt-2 text-sm opacity-70">
        Sistema de gestión para un taller de chapa y pintura.
      </p>
      <form
        action={async () => {
          "use server";
          await signIn("google");
        }}
        className="mt-6"
      >
        <button
          type="submit"
          className="rounded-md bg-black px-4 py-2 text-sm font-medium text-white"
        >
          Entrar con Google
        </button>
      </form>
    </main>
  );
}
