import { useQuery } from '@tanstack/react-query';
import { api, ApiResponse } from '@/services/api';

interface DirectoryStaff {
  id: string;
  firstName: string;
  lastName: string;
  role: string;
  department: { id: string; name: string } | null;
}

async function fetchDirectory(role?: string) {
  const res = await api.get<ApiResponse<{ staff: DirectoryStaff[] }>>('/staff-directory', { params: { role } });
  return res.data.data!.staff;
}

export function StaffPicker({
  role,
  value,
  onChange,
  placeholder = 'Select...',
}: {
  role?: string;
  value: string;
  onChange: (id: string) => void;
  placeholder?: string;
}) {
  const { data } = useQuery({ queryKey: ['staff-directory', role], queryFn: () => fetchDirectory(role) });

  return (
    <select className="input" value={value} onChange={(e) => onChange(e.target.value)}>
      <option value="" disabled>
        {placeholder}
      </option>
      {data?.map((s) => (
        <option key={s.id} value={s.id}>
          {s.firstName} {s.lastName}
          {s.department ? ` — ${s.department.name}` : ''}
        </option>
      ))}
    </select>
  );
}
