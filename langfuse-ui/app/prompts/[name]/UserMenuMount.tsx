"use client";

import { UserMenu } from "../../components/UserMenu";

export default function UserMenuMount({ areaOptions = [], languageOptions = [] }: { areaOptions?: string[]; languageOptions?: string[] }) {
  return (
    <UserMenu
      areaOptions={areaOptions}
      languageOptions={languageOptions}
      exposeOpenRef={(open) => { (window as any).openUserMenu = open; }}
    />
  );
}


