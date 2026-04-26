import { HomeChrome } from "@/app/home/home-chrome";

export default function HomeLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return <HomeChrome>{children}</HomeChrome>;
}
