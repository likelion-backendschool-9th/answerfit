import { LoginCard } from "@/app/_components/LoginCard/LoginCard";
import { LoginDialog } from "./_components/LoginDialog/LoginDialog";

type Props = { searchParams: Promise<{ next?: string | string[]; error?: string | string[] }> };

/**
 * 화면 안에서 /login으로 이동하면 이 슬롯이 가로채 보던 화면 위에 모달을 띄운다.
 * 주소로 직접 들어오거나 새로고침하면 가로채지 않고 /login 페이지가 열린다.
 */
export default function LoginModalPage({ searchParams }: Props) {
  return (
    <LoginDialog>
      <LoginCard searchParams={searchParams} modal />
    </LoginDialog>
  );
}
