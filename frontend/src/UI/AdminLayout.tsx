
import { Outlet } from 'react-router-dom';

export default function AdminLayout() {
    return (
        <div className="w-full min-h-screen bg-[#0F172A]">
            <Outlet />
        </div>
    );
}