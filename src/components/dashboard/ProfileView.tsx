"use client";

import { useState } from "react";
import {
  BadgeCheck,
  BellRing,
  Building2,
  CalendarDays,
  Check,
  KeyRound,
  Mail,
  MapPin,
  Pencil,
  Phone,
  ShieldCheck,
  UserRound,
  X,
} from "lucide-react";

type Profile = {
  name: string;
  initials: string;
  role: string;
  email: string;
  phone: string;
  location: string;
  organization: string;
  joinedAt: string;
  bio: string;
  credential: string;
  metrics: Array<{ label: string; value: string }>;
};

export function ProfileView({ profile }: { profile: Profile }) {
  const [editing, setEditing] = useState(false);
  const [saved, setSaved] = useState(false);
  const [form, setForm] = useState({ name: profile.name, phone: profile.phone, location: profile.location, bio: profile.bio });

  const save = () => {
    setEditing(false);
    setSaved(true);
    window.setTimeout(() => setSaved(false), 2200);
  };

  return (
    <div className="space-y-8">
      <section className="grid-pattern relative overflow-hidden rounded-[24px] bg-[#294f3b] p-8 text-white sm:p-10">
        <div className="relative z-10 flex flex-col gap-10 sm:flex-row sm:items-center">
          <span className="grid size-24 shrink-0 place-items-center rounded-[26px] border-4 border-white/15 bg-[#EED56D] text-2xl font-extrabold text-[#2E5A44]">{profile.initials}</span>
          <div className="flex-1">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/10 px-4 py-1.5 text-[14px] font-bold text-[#EED56D]"><BadgeCheck size={12} /> TÀI KHOẢN ĐÃ XÁC THỰC</span>
            <h1 className="mt-4 text-2xl font-extrabold tracking-[-.8px] sm:text-3xl">{form.name}</h1>
            <p className="mt-1 text-[13px] text-[#ccdbd1]">{profile.role} • {profile.organization}</p>
          </div>
          <button onClick={() => setEditing(true)} className="no-print flex items-center justify-center gap-4 rounded-xl bg-[#EED56D] px-5 py-4 text-[15px] font-bold text-[#2E5A44]"><Pencil size={14} /> Chỉnh sửa hồ sơ</button>
        </div>
        <div className="absolute -bottom-24 -right-16 size-64 rounded-full border-[48px] border-white/[.04]" />
      </section>

      {saved && <div className="flex items-center gap-4 rounded-xl border border-[#cfe1d3] bg-[#edf7ef] px-5 py-4 text-[13px] font-bold text-[#39704f]"><Check size={15} /> Thông tin mock đã được cập nhật.</div>}

      <section className="grid gap-7 sm:grid-cols-3">
        {profile.metrics.map((metric) => <article key={metric.label} className="panel p-7"><small className="text-[15px] text-[#849087]">{metric.label}</small><b className="mt-2 block text-2xl text-[#2E5A44]">{metric.value}</b></article>)}
      </section>

      <section className="grid gap-9 xl:grid-cols-[1.15fr_.85fr]">
        <article className="panel p-7 sm:p-8">
          <div className="flex items-center gap-7"><span className="grid size-10 place-items-center rounded-xl bg-[#e9f0ea] text-[#2E5A44]"><UserRound size={19} /></span><div><h2 className="text-[14px] font-bold">Thông tin cá nhân</h2><p className="mt-1 text-[15px] text-[#849087]">Thông tin định danh và liên hệ trên hệ thống</p></div></div>
          <div className="mt-8 grid gap-9 sm:grid-cols-2">
            {[
              [Mail, "Email đăng nhập", profile.email],
              [Phone, "Số điện thoại", form.phone],
              [MapPin, "Khu vực hoạt động", form.location],
              [Building2, "Đơn vị", profile.organization],
              [CalendarDays, "Tham gia từ", profile.joinedAt],
              [ShieldCheck, "Năng lực / định danh", profile.credential],
            ].map(([Icon, label, value]) => {
              const FieldIcon = Icon as typeof Mail;
              return <div key={String(label)} className="flex gap-7"><FieldIcon size={16} className="mt-0.5 shrink-0 text-[#6d8275]" /><span><small className="block text-[14px] text-[#89958d]">{String(label)}</small><b className="mt-1 block text-[13px] leading-4">{String(value)}</b></span></div>;
            })}
          </div>
          <div className="mt-8 rounded-2xl bg-[#f6f8f5] p-5"><small className="text-[14px] font-bold tracking-[1px] text-[#849087]">GIỚI THIỆU</small><p className="mt-2 text-[13px] leading-5 text-[#607067]">{form.bio}</p></div>
        </article>

        <div className="space-y-8">
          <article className="panel p-7 sm:p-8">
            <div className="flex items-center gap-7"><span className="grid size-10 place-items-center rounded-xl bg-[#fbf2cb] text-[#795e11]"><KeyRound size={19} /></span><div><h2 className="text-[14px] font-bold">Bảo mật tài khoản</h2><p className="mt-1 text-[15px] text-[#849087]">Thiết lập đăng nhập và phiên làm việc</p></div></div>
            <div className="mt-7 space-y-5">
              <div className="flex items-center justify-between rounded-xl border border-[#e3e8e1] p-4"><span><b className="block text-[13px]">Mật khẩu</b><small className="mt-1 block text-[14px] text-[#87938b]">Cập nhật 36 ngày trước</small></span><button className="text-[14px] font-bold text-[#2E5A44]">Thay đổi</button></div>
              <div className="flex items-center justify-between rounded-xl border border-[#e3e8e1] p-4"><span><b className="block text-[13px]">Xác thực hai lớp</b><small className="mt-1 block text-[14px] text-[#87938b]">Bảo vệ thao tác quan trọng</small></span><span className="rounded-full bg-[#e9f2ea] px-2 py-1 text-[13px] font-bold text-[#39704f]">Đã bật</span></div>
            </div>
          </article>
          <article className="panel p-7 sm:p-8">
            <div className="flex items-center gap-7"><BellRing size={18} className="text-[#2E5A44]" /><h2 className="text-[13px] font-bold">Kênh thông báo</h2></div>
            <div className="mt-5 space-y-5 text-[15px]">
              <label className="flex items-center justify-between"><span>Cảnh báo cảm biến và dịch bệnh</span><input type="checkbox" defaultChecked className="accent-[#2E5A44]" /></label>
              <label className="flex items-center justify-between"><span>Yêu cầu hợp tác mới</span><input type="checkbox" defaultChecked className="accent-[#2E5A44]" /></label>
              <label className="flex items-center justify-between"><span>Báo cáo vận hành hàng tuần</span><input type="checkbox" className="accent-[#2E5A44]" /></label>
            </div>
          </article>
        </div>
      </section>

      {editing && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-[#183226aa] p-5 backdrop-blur-sm">
          <div className="w-full max-w-[520px] rounded-[24px] bg-white p-8 shadow-2xl">
            <div className="flex items-start justify-between"><div><small className="text-[14px] font-bold tracking-[1px] text-[#849087]">PROFILE SETTINGS</small><h2 className="mt-2 text-xl font-extrabold">Chỉnh sửa thông tin</h2></div><button onClick={() => setEditing(false)} className="grid size-9 place-items-center rounded-xl bg-[#f2f4f1]"><X size={18} /></button></div>
            <div className="mt-7 grid gap-8">
              <label><span className="mb-2 block text-[15px] font-bold">Họ và tên</span><input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} className="h-11 w-full rounded-xl border border-[#dfe5de] px-4 text-[14px] outline-none focus:border-[#678873]" /></label>
              <div className="grid gap-8 sm:grid-cols-2">
                <label><span className="mb-2 block text-[15px] font-bold">Số điện thoại</span><input value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} className="h-11 w-full rounded-xl border border-[#dfe5de] px-4 text-[14px] outline-none focus:border-[#678873]" /></label>
                <label><span className="mb-2 block text-[15px] font-bold">Khu vực</span><input value={form.location} onChange={(event) => setForm({ ...form, location: event.target.value })} className="h-11 w-full rounded-xl border border-[#dfe5de] px-4 text-[14px] outline-none focus:border-[#678873]" /></label>
              </div>
              <label><span className="mb-2 block text-[15px] font-bold">Giới thiệu</span><textarea value={form.bio} onChange={(event) => setForm({ ...form, bio: event.target.value })} rows={4} className="w-full resize-none rounded-xl border border-[#dfe5de] p-4 text-[14px] leading-5 outline-none focus:border-[#678873]" /></label>
            </div>
            <div className="mt-8 grid grid-cols-2 gap-7"><button onClick={() => setEditing(false)} className="rounded-xl border border-[#dfe5de] py-4 text-[15px] font-bold">Hủy</button><button onClick={save} className="rounded-xl bg-[#2E5A44] py-4 text-[15px] font-bold text-white">Lưu thay đổi</button></div>
          </div>
        </div>
      )}
    </div>
  );
}


