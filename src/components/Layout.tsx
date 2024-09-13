export function Layout({ children }: React.PropsWithChildren) {
  return (
    <div className='flex w-[21rem] flex-col border-8 border-popup-border p-3'>
      {children}
    </div>
  );
}
