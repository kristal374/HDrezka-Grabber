export function Layout({ children }: React.PropsWithChildren) {
  return (
    <div className='w-80 h-52 flex items-center justify-center p-5'>
      {children}
    </div>
  );
}
