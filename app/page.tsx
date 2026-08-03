import Link from "next/link";
import { Brand } from "@/components/brand";
import { Icon, type IconName } from "@/components/icons";

const workflow: { time: string; title: string; text: string; icon: IconName }[] = [
  {
    time: "18:00",
    title: "Takliflar jamlanadi",
    text: "Dehqon ertangi hosil, hajm va narxini platformaga kiritadi.",
    icon: "leaf",
  },
  {
    time: "20:00",
    title: "Buyurtmalar yopiladi",
    text: "Restoran mavjud mahsulotni tanlaydi va buyurtmani tasdiqlaydi.",
    icon: "store",
  },
  {
    time: "05:30",
    title: "Yig‘ish boshlanadi",
    text: "Yig‘uvchi tayyor marshrut bo‘yicha mahsulotni qabul qiladi.",
    icon: "route",
  },
  {
    time: "08:00",
    title: "Oshxonaga yetadi",
    text: "Saralangan yangi mahsulot hujjatlari bilan restoranga yetkaziladi.",
    icon: "truck",
  },
];

const roles: {
  label: string;
  title: string;
  text: string;
  icon: IconName;
  tone: string;
  features: string[];
}[] = [
  {
    label: "Dehqon uchun",
    title: "Hosilingizga aniq bozor",
    text: "Ertangi mahsulotni bir necha daqiqada taklif qiling va jarayonni kuzating.",
    icon: "leaf",
    tone: "bg-accent/45 text-gold2",
    features: ["Kunlik qabul narxlari", "Taklif va holat nazorati", "Balans va to‘lov tarixi"],
  },
  {
    label: "Restoran uchun",
    title: "Yangi mahsulot — reja asosida",
    text: "Katalogdan kerakli hajmni tanlang, buyurtma va yetkazishni bir joyda boshqaring.",
    icon: "store",
    tone: "bg-[#E5F1EA] text-gold",
    features: ["Ertangi kun katalogi", "Buyurtma holati va tarix", "Faktura bilan hisob-kitob"],
  },
  {
    label: "Yig‘uvchi uchun",
    title: "Har bir nuqta nazoratda",
    text: "Tayyor marshrut, rejalashtirilgan hajm va qabul natijasi doim qo‘lingizda.",
    icon: "truck",
    tone: "bg-[#FFF0DC] text-[#A45D12]",
    features: ["Tartiblangan marshrut", "Fakt kilogramm va sifat", "Jonli yig‘im holati"],
  },
];

const advantages: { title: string; text: string; icon: IconName }[] = [
  {
    title: "Shaffof narx",
    text: "Qabul va sotuv narxlari oldindan ko‘rinadi; hisob-kitob tushunarli qoladi.",
    icon: "chart",
  },
  {
    title: "Bitta operatsion oqim",
    text: "Taklif, buyurtma, yig‘im va yetkazish uzilmasdan bir tizimda ishlaydi.",
    icon: "refresh",
  },
  {
    title: "Aniq vaqt va holat",
    text: "Har bir ishtirokchi keyingi qadamni va jarayonning joriy holatini ko‘radi.",
    icon: "clock",
  },
  {
    title: "Himoyalangan kirish",
    text: "Telefon orqali tez kirish va rolga mos kabinet kundalik ishni soddalashtiradi.",
    icon: "shield",
  },
];

const aiFeatures: { title: string; text: string; icon: IconName }[] = [
  {
    title: "Rolga mos tushuntirish",
    text: "AI aynan ochiq kabinet va sahifani biladi, keyingi qadamni sodda o‘zbek tilida tushuntiradi.",
    icon: "sparkles",
  },
  {
    title: "Yozma va ovozli suhbat",
    text: "Savolni yozing yoki o‘zbekcha ayting; javobni o‘qish bilan birga ovozda ham tinglang.",
    icon: "mic",
  },
  {
    title: "Xavfsiz amaliy yordam",
    text: "Kerakli bo‘limni ochadi, muhim profil va rol amallarini esa faqat tasdiqlashingizdan keyin bajaradi.",
    icon: "shield",
  },
];

function HeroVisual() {
  const routeStops: { label: string; note: string; icon: IconName }[] = [
    { label: "Dehqon", note: "Qabul", icon: "leaf" },
    { label: "Yig‘im", note: "Saralash", icon: "box" },
    { label: "Restoran", note: "Yetkazish", icon: "store" },
  ];

  return (
    <div className="relative mx-auto w-full max-w-[590px] lg:ml-auto" aria-label="DalaBozor operatsion paneli namunasi">
      <div className="absolute -left-8 top-16 h-40 w-40 rounded-full bg-accent/45 blur-3xl" aria-hidden="true" />
      <div className="absolute -right-8 bottom-12 h-44 w-44 rounded-full bg-green/15 blur-3xl" aria-hidden="true" />

      <div className="surface-card relative overflow-hidden p-4 shadow-float sm:p-6">
        <div className="flex items-center justify-between gap-4 border-b border-line pb-4">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-2xl bg-gold text-white">
              <Icon name="route" className="h-5 w-5" />
            </span>
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.12em] text-muted">Operatsion panel</p>
              <p className="mt-0.5 font-head font-extrabold tracking-[-0.02em] text-text">Ertalabki yetkazish</p>
            </div>
          </div>
          <span className="inline-flex items-center gap-2 rounded-full bg-green/10 px-3 py-1.5 text-xs font-bold text-green">
            <span className="h-2 w-2 rounded-full bg-green" />
            Reja tayyor
          </span>
        </div>

        <div className="mt-5 grid grid-cols-3 gap-2 sm:gap-3">
          {[
            { label: "Taklif", value: "18:00", icon: "leaf" as IconName },
            { label: "Buyurtma", value: "20:00", icon: "store" as IconName },
            { label: "Yetkazish", value: "08:00", icon: "truck" as IconName },
          ].map((item) => (
            <div key={item.label} className="rounded-2xl border border-line bg-bg/60 p-3 sm:p-4">
              <Icon name={item.icon} className="h-4 w-4 text-gold" />
              <p className="mt-3 text-[10px] font-bold uppercase tracking-[0.1em] text-muted sm:text-xs">{item.label}</p>
              <p className="mt-1 font-mono text-base font-bold text-text sm:text-lg">{item.value}</p>
            </div>
          ))}
        </div>

        <div className="mt-4 rounded-[20px] bg-gold2 p-4 text-white sm:p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold text-white/60">Yig‘ish marshruti</p>
              <p className="mt-1 text-sm font-extrabold">Daladan oshxonagacha</p>
            </div>
            <span className="rounded-full bg-accent px-3 py-1.5 text-xs font-extrabold text-gold2">05:30 → 08:00</span>
          </div>

          <div className="relative mt-6 grid grid-cols-3 gap-2">
            <div className="absolute left-[16.66%] right-[16.66%] top-5 border-t border-dashed border-white/35" aria-hidden="true" />
            {routeStops.map((stop) => (
              <div key={stop.label} className="relative z-10 text-center">
                <span className="mx-auto grid h-10 w-10 place-items-center rounded-full border-4 border-gold2 bg-white text-gold">
                  <Icon name={stop.icon} className="h-4 w-4" />
                </span>
                <p className="mt-2 text-xs font-bold sm:text-sm">{stop.label}</p>
                <p className="mt-0.5 text-[10px] text-white/55 sm:text-xs">{stop.note}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-4 flex items-center gap-3 rounded-2xl border border-line bg-white px-4 py-3">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-accent/50 text-gold2">
            <Icon name="check" className="h-4 w-4" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-3 text-xs font-bold text-text">
              <span>Buyurtmadan yetkazishgacha</span>
              <span>Bir oqim</span>
            </div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-bg2">
              <div className="h-full w-full rounded-full bg-gradient-to-r from-gold to-green" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function WorkflowStep({
  item,
  index,
}: {
  item: (typeof workflow)[number];
  index: number;
}) {
  return (
    <article className="relative z-10 flex gap-4 rounded-[22px] border border-line bg-white p-5 shadow-[0_12px_30px_rgba(20,55,39,.05)] lg:block lg:border-0 lg:bg-transparent lg:p-0 lg:shadow-none">
      <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-gold text-white shadow-[0_8px_20px_rgba(23,92,58,.16)] lg:h-14 lg:w-14">
        <Icon name={item.icon} className="h-5 w-5 lg:h-6 lg:w-6" />
      </span>
      <div className="min-w-0 lg:mt-5">
        <div className="flex items-center gap-2">
          <span className="font-mono text-sm font-extrabold text-gold">{item.time}</span>
          <span className="text-xs font-bold text-dim">0{index + 1}</span>
        </div>
        <h3 className="mt-1.5 font-head text-lg font-extrabold tracking-[-0.025em] text-text">{item.title}</h3>
        <p className="mt-2 text-sm leading-6 text-muted">{item.text}</p>
      </div>
    </article>
  );
}

export default function Landing() {
  return (
    <div className="overflow-hidden">
      <header className="sticky top-0 z-50 border-b border-line/80 bg-[#F4F5EE]/85 backdrop-blur-xl">
        <nav className="mx-auto flex h-[72px] max-w-7xl items-center justify-between gap-5 px-5 sm:px-7 lg:px-8" aria-label="Asosiy navigatsiya">
          <Brand />
          <div className="hidden items-center gap-7 lg:flex">
            <Link href="#qanday-ishlaydi" className="text-sm font-bold text-muted transition hover:text-gold">
              Qanday ishlaydi
            </Link>
            <Link href="#rollar" className="text-sm font-bold text-muted transition hover:text-gold">
              Kimlar uchun
            </Link>
            <Link href="#ai-yordamchi" className="text-sm font-bold text-muted transition hover:text-gold">
              AI yordamchi
            </Link>
            <Link href="#imkoniyatlar" className="text-sm font-bold text-muted transition hover:text-gold">
              Imkoniyatlar
            </Link>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <Link href="/kirish" className="hidden rounded-xl px-3 py-2 text-sm font-extrabold text-text transition hover:bg-white/70 sm:inline-flex">
              Kirish
            </Link>
            <Link href="/kirish" className="gold-btn min-h-10 px-4 py-2 text-sm sm:px-5">
              Boshlash
              <Icon name="arrow" className="h-4 w-4" />
            </Link>
          </div>
        </nav>
      </header>

      <main>
        <section className="relative">
          <div className="absolute left-1/2 top-0 h-[34rem] w-[72rem] -translate-x-1/2 rounded-full bg-gradient-to-b from-accent/20 to-transparent blur-3xl" aria-hidden="true" />
          <div className="relative mx-auto grid max-w-7xl items-center gap-12 px-5 pb-20 pt-14 sm:px-7 sm:pb-24 sm:pt-20 lg:grid-cols-[1.02fr_.98fr] lg:gap-16 lg:px-8 lg:pb-28 lg:pt-24">
            <div>
              <div className="pill px-3.5 py-2 text-xs font-extrabold uppercase tracking-[0.12em]">
                <Icon name="leaf" className="h-4 w-4" />
                B2B agro logistika platformasi
              </div>
              <h1 className="text-balance mt-6 font-head text-[clamp(2.7rem,6vw,5.15rem)] font-extrabold leading-[0.98] tracking-[-0.065em] text-text">
                Daladan oshxonagacha — <span className="text-gold">bitta aniq oqim.</span>
              </h1>
              <p className="mt-6 max-w-xl text-base leading-7 text-muted sm:text-lg sm:leading-8">
                DalaBozor dehqon taklifi, restoran buyurtmasi va ertalabki yetkazishni bitta raqamli tizimda birlashtiradi.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link href="/kirish" className="gold-btn px-6 py-3.5">
                  Platformaga kirish
                  <Icon name="arrow" className="h-4 w-4" />
                </Link>
                <Link href="#qanday-ishlaydi" className="outline-btn px-6 py-3.5">
                  Jarayonni ko‘rish
                  <Icon name="chevron" className="h-4 w-4 rotate-90" />
                </Link>
              </div>
              <div className="mt-8 grid gap-3 border-t border-line pt-6 sm:grid-cols-3">
                {["Shaffof narx", "O‘zbekcha AI yordamchi", "Ertalabki yetkazish"].map((item) => (
                  <div key={item} className="flex items-center gap-2 text-sm font-bold text-text">
                    <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-green/10 text-green">
                      <Icon name="check" className="h-3.5 w-3.5" />
                    </span>
                    {item}
                  </div>
                ))}
              </div>
            </div>
            <HeroVisual />
          </div>
        </section>

        <section id="qanday-ishlaydi" className="border-y border-line bg-white/55 scroll-mt-24">
          <div className="mx-auto max-w-7xl px-5 py-20 sm:px-7 sm:py-24 lg:px-8 lg:py-28">
            <div className="mx-auto max-w-3xl text-center">
              <p className="eyebrow">Bir kechalik aniq sikl</p>
              <h2 className="text-balance mt-3 font-head text-3xl font-extrabold tracking-[-0.045em] text-text sm:text-4xl lg:text-5xl">
                Bugun rejalang. Ertalab mahsulotni qabul qiling.
              </h2>
              <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-muted">
                Har bir qadam belgilangan vaqtda ishga tushadi. Platforma uch tomonning harakatini bir-biriga bog‘laydi.
              </p>
            </div>

            <div className="relative mt-12 grid gap-4 lg:mt-16 lg:grid-cols-4 lg:gap-8">
              <div className="absolute left-7 right-[calc(25%_-_1.75rem)] top-7 hidden border-t-2 border-dashed border-gold/20 lg:block" aria-hidden="true" />
              {workflow.map((item, index) => (
                <WorkflowStep key={item.time} item={item} index={index} />
              ))}
            </div>
          </div>
        </section>

        <section id="rollar" className="scroll-mt-24">
          <div className="mx-auto max-w-7xl px-5 py-20 sm:px-7 sm:py-24 lg:px-8 lg:py-28">
            <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
              <div className="max-w-3xl">
                <p className="eyebrow">Har bir rol uchun</p>
                <h2 className="text-balance mt-3 font-head text-3xl font-extrabold tracking-[-0.045em] text-text sm:text-4xl lg:text-5xl">
                  Bitta platforma. Uchta qulay kabinet.
                </h2>
              </div>
              <p className="max-w-md text-base leading-7 text-muted">
                Har kim faqat o‘z ishiga kerakli ma’lumot va amallarni ko‘radi — ortiqcha murakkabliksiz.
              </p>
            </div>

            <div className="mt-10 grid gap-5 lg:grid-cols-3">
              {roles.map((role) => (
                <article key={role.label} className="surface-card group p-6 transition duration-300 hover:-translate-y-1 hover:shadow-float sm:p-7">
                  <div className="flex items-start justify-between gap-4">
                    <span className={`grid h-12 w-12 place-items-center rounded-2xl ${role.tone}`}>
                      <Icon name={role.icon} className="h-6 w-6" />
                    </span>
                    <span className="rounded-full border border-line bg-bg/60 px-3 py-1.5 text-xs font-extrabold text-muted">{role.label}</span>
                  </div>
                  <h3 className="mt-7 font-head text-2xl font-extrabold tracking-[-0.035em] text-text">{role.title}</h3>
                  <p className="mt-3 text-sm leading-6 text-muted">{role.text}</p>
                  <ul className="mt-6 space-y-3 border-t border-line pt-5">
                    {role.features.map((feature) => (
                      <li key={feature} className="flex items-center gap-3 text-sm font-bold text-text">
                        <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-green/10 text-green">
                          <Icon name="check" className="h-3.5 w-3.5" />
                        </span>
                        {feature}
                      </li>
                    ))}
                  </ul>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="ai-yordamchi" className="scroll-mt-24 border-y border-line bg-white/55">
          <div className="mx-auto grid max-w-7xl items-center gap-12 px-5 py-20 sm:px-7 sm:py-24 lg:grid-cols-[.92fr_1.08fr] lg:gap-16 lg:px-8 lg:py-28">
            <div>
              <span className="pill px-3.5 py-2 text-xs font-extrabold uppercase tracking-[0.12em]">
                <Icon name="sparkles" className="h-4 w-4" />
                Dala AI yordamchi
              </span>
              <h2 className="text-balance mt-5 font-head text-3xl font-extrabold tracking-[-0.045em] text-text sm:text-4xl lg:text-5xl">
                Platformani o‘rganmang — <span className="text-gold">AI sizga ish jarayonida o‘rgatsin.</span>
              </h2>
              <p className="mt-5 max-w-xl text-base leading-7 text-muted">
                Yordamchi joriy rolingiz va ochiq bo‘limingizni hisobga olib, DalaBozordagi keyingi qadamni tushuntiradi. Savolni yozish ham, o‘zbekcha ovozda aytish ham mumkin.
              </p>

              <div className="mt-8 space-y-4">
                {aiFeatures.map((feature) => (
                  <div key={feature.title} className="flex gap-4">
                    <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-gold/10 text-gold">
                      <Icon name={feature.icon} className="h-5 w-5" />
                    </span>
                    <div>
                      <h3 className="text-sm font-extrabold text-text sm:text-base">{feature.title}</h3>
                      <p className="mt-1 text-sm leading-6 text-muted">{feature.text}</p>
                    </div>
                  </div>
                ))}
              </div>

              <Link href="/kirish" className="gold-btn mt-8 px-6 py-3.5">
                AI yordamchini sinash
                <Icon name="arrow" className="h-4 w-4" />
              </Link>
            </div>

            <div className="relative mx-auto w-full max-w-[620px]">
              <div className="absolute -left-8 top-10 h-44 w-44 rounded-full bg-accent/45 blur-3xl" aria-hidden="true" />
              <div className="absolute -right-8 bottom-8 h-48 w-48 rounded-full bg-green/15 blur-3xl" aria-hidden="true" />
              <div className="surface-card relative overflow-hidden p-3 shadow-float sm:p-5">
                <div className="rounded-[22px] bg-gold2 p-4 text-white sm:p-5">
                  <div className="flex items-center gap-3">
                    <span className="relative grid h-11 w-11 place-items-center rounded-2xl bg-accent text-gold2">
                      <Icon name="sparkles" className="h-5 w-5" />
                      <span className="absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full border-2 border-gold2 bg-[#6FE78F]" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="font-head font-extrabold">Dala AI</p>
                      <p className="mt-0.5 text-xs text-white/55">O‘zbekcha platforma yordamchisi</p>
                    </div>
                    <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-wider text-accent">Dehqon · E’lon</span>
                  </div>
                </div>

                <div className="min-h-[340px] bg-[#F8F9F4] px-3 py-5 sm:px-5">
                  <div className="ml-auto max-w-[84%] rounded-[20px_20px_6px_20px] bg-gold px-4 py-3 text-sm leading-6 text-white shadow-sm">
                    Ertangi pomidorimni qanday e’lon qilaman?
                  </div>

                  <div className="mt-4 flex max-w-[92%] items-start gap-2.5">
                    <span className="mt-1 grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-accent text-gold2">
                      <Icon name="sparkles" className="h-4 w-4" />
                    </span>
                    <div className="rounded-[6px_20px_20px_20px] border border-line bg-white px-4 py-3 text-sm leading-6 text-text shadow-sm">
                      <p>“Mahsulot berish” bo‘limini oching. Mahsulot, sana, kilogramm va narxni kiriting — tizim narx koridorini o‘zi tekshiradi.</p>
                      <div className="mt-3 flex items-center justify-between gap-3 rounded-xl bg-gold/[.06] px-3 py-2.5">
                        <span className="flex items-center gap-2 text-xs font-bold text-gold">
                          <Icon name="arrow" className="h-3.5 w-3.5" />
                          Mahsulot berish bo‘limini ochish
                        </span>
                        <span className="rounded-lg bg-white px-2 py-1 text-[10px] font-extrabold text-muted">Tasdiqlash</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 flex items-center gap-3 rounded-2xl border border-line bg-white p-3 shadow-sm">
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-red/10 text-red">
                      <Icon name="mic" className="h-5 w-5" />
                    </span>
                    <div className="flex h-8 flex-1 items-center gap-1" aria-label="Ovoz to‘lqini namunasi">
                      {[10, 18, 25, 14, 29, 20, 11, 24, 17, 8, 19, 12].map((height, index) => (
                        <span key={`${height}-${index}`} className="w-1 flex-1 rounded-full bg-gold/35" style={{ height }} />
                      ))}
                    </div>
                    <span className="font-mono text-xs font-bold text-muted">00:08</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 border-t border-line bg-white p-3 sm:p-4">
                  <span className="flex min-h-11 flex-1 items-center rounded-xl bg-bg px-4 text-sm text-dim">Dala AI’dan so‘rang…</span>
                  <span className="grid h-11 w-11 place-items-center rounded-xl bg-gold text-white">
                    <Icon name="send" className="h-4 w-4" />
                  </span>
                </div>
              </div>
              <p className="mt-4 text-center text-xs leading-5 text-muted">
                AI muhim hisob-kitob yoki rol amalini foydalanuvchi tasdig‘isiz bajarmaydi.
              </p>
            </div>
          </div>
        </section>

        <section id="imkoniyatlar" className="scroll-mt-24 px-5 pb-20 sm:px-7 sm:pb-24 lg:px-8 lg:pb-28">
          <div className="noise-panel relative mx-auto max-w-7xl overflow-hidden rounded-[32px] px-6 py-10 text-white shadow-float sm:px-10 sm:py-14 lg:px-14 lg:py-16">
            <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full border-[48px] border-white/5" aria-hidden="true" />
            <div className="relative grid gap-12 lg:grid-cols-[.8fr_1.2fr] lg:gap-16">
              <div>
                <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3.5 py-2 text-xs font-extrabold uppercase tracking-[0.12em] text-accent">
                  <Icon name="settings" className="h-4 w-4" />
                  Platforma afzalliklari
                </span>
                <h2 className="text-balance mt-5 font-head text-3xl font-extrabold tracking-[-0.045em] sm:text-4xl">
                  Kundalik savdoni oddiy, tez va kuzatiladigan qiling.
                </h2>
                <p className="mt-4 max-w-lg leading-7 text-white/65">
                  Alohida daftar, qo‘ng‘iroq va tarqoq yozishmalar o‘rniga barcha muhim jarayon bir kabinetda jamlanadi.
                </p>
                <Link href="/kirish" className="mt-8 inline-flex min-h-12 items-center justify-center gap-2 rounded-[14px] bg-accent px-6 py-3 font-extrabold text-gold2 transition hover:-translate-y-0.5 hover:bg-white">
                  Kabinetni ochish
                  <Icon name="arrow" className="h-4 w-4" />
                </Link>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                {advantages.map((item) => (
                  <article key={item.title} className="rounded-[22px] border border-white/10 bg-white/[0.07] p-5 backdrop-blur-sm sm:p-6">
                    <span className="grid h-10 w-10 place-items-center rounded-2xl bg-white/10 text-accent">
                      <Icon name={item.icon} className="h-5 w-5" />
                    </span>
                    <h3 className="mt-5 font-head text-lg font-extrabold">{item.title}</h3>
                    <p className="mt-2 text-sm leading-6 text-white/60">{item.text}</p>
                  </article>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="border-y border-line bg-white/55">
          <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-7 px-5 py-16 text-center sm:px-7 lg:flex-row lg:px-8 lg:py-20 lg:text-left">
            <div className="max-w-3xl">
              <p className="eyebrow">Ishni bugun boshlang</p>
              <h2 className="text-balance mt-3 font-head text-3xl font-extrabold tracking-[-0.045em] text-text sm:text-4xl">
                Ertangi savdoni aniq reja bilan kutib oling.
              </h2>
              <p className="mt-3 text-base leading-7 text-muted">Telefon raqamingiz orqali kiring va o‘zingizga mos rolni tanlang.</p>
            </div>
            <Link href="/kirish" className="gold-btn w-full shrink-0 px-7 py-3.5 sm:w-auto">
              DalaBozor’ga kirish
              <Icon name="arrow" className="h-4 w-4" />
            </Link>
          </div>
        </section>
      </main>

      <footer className="bg-[#E9EDE3]/70">
        <div className="mx-auto max-w-7xl px-5 py-12 sm:px-7 lg:px-8 lg:py-16">
          <div className="grid gap-10 border-b border-line pb-10 sm:grid-cols-2 lg:grid-cols-[1.3fr_.7fr_.7fr]">
            <div className="max-w-sm">
              <Brand />
              <p className="mt-4 text-sm leading-6 text-muted">
                Dehqon, restoran va yig‘uvchini bitta aniq savdo-yetkazish oqimida birlashtiruvchi agro platforma.
              </p>
            </div>
            <div>
              <h2 className="text-sm font-extrabold text-text">Platforma</h2>
              <nav className="mt-4 flex flex-col gap-3" aria-label="Footer platforma havolalari">
                <Link href="#qanday-ishlaydi" className="text-sm text-muted transition hover:text-gold">Qanday ishlaydi</Link>
                <Link href="#ai-yordamchi" className="text-sm text-muted transition hover:text-gold">AI yordamchi</Link>
                <Link href="#imkoniyatlar" className="text-sm text-muted transition hover:text-gold">Imkoniyatlar</Link>
                <Link href="/kirish" className="text-sm text-muted transition hover:text-gold">Kabinetga kirish</Link>
              </nav>
            </div>
            <div>
              <h2 className="text-sm font-extrabold text-text">Kimlar uchun</h2>
              <nav className="mt-4 flex flex-col gap-3" aria-label="Footer rollar havolalari">
                <Link href="#rollar" className="text-sm text-muted transition hover:text-gold">Dehqonlar</Link>
                <Link href="#rollar" className="text-sm text-muted transition hover:text-gold">Restoranlar</Link>
                <Link href="#rollar" className="text-sm text-muted transition hover:text-gold">Yig‘uvchilar</Link>
              </nav>
            </div>
          </div>
          <div className="flex flex-col gap-2 pt-6 text-xs text-muted sm:flex-row sm:items-center sm:justify-between">
            <p>© {new Date().getFullYear()} DalaBozor. Barcha huquqlar himoyalangan.</p>
            <p>Daladan oshxonagacha — ishonchli va shaffof.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
