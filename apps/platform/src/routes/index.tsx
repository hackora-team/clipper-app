import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";

export const Route = createFileRoute("/")({
	component: LandingPage,
});

function LandingPage() {
	const [vidCount, setVidCount] = useState(5);
	const [durLevel, setDurLevel] = useState(2);
	const [openFaq, setOpenFaq] = useState<number | null>(null);

	const creditsMap: Record<number, number> = { 1: 1, 2: 3, 3: 5 };
	const durLabelMap: Record<number, string> = {
		1: "0–10 mnt",
		2: "10–30 mnt",
		3: "30–60 mnt",
	};

	const creditPerVideo = creditsMap[durLevel];
	const totalCredits = vidCount * creditPerVideo;

	const recommendedPlan = () => {
		if (totalCredits <= 5) return "Free (gratis)";
		if (totalCredits <= 20) return "Pro 20";
		if (totalCredits <= 40) return "Pro 40";
		return "Business 40";
	};

	const faqs = [
		{
			q: "Apa itu kredit dan bagaimana cara kerjanya?",
			a: "Kredit adalah mata uang Clipper untuk memproses video. Setiap video dikenakan biaya berdasarkan durasi: 0–10 mnt = 1 kredit, 10–30 mnt = 3 kredit, 30–60 mnt = 5 kredit. Kredit reset setiap bulan pada tanggal billing dan tidak bisa dipindahkan ke bulan berikutnya.",
		},
		{
			q: "Apakah video saya tersimpan di server?",
			a: "Tidak. Semua file (video upload, audio, dan clip hasil) otomatis dihapus setelah 24 jam. Kami tidak menyimpan kontenmu secara permanen.",
		},
		{
			q: "Bahasa apa saja yang didukung?",
			a: "ElevenLabs Scribe v2 mendukung 99+ bahasa termasuk Bahasa Indonesia. Deteksi bahasa dilakukan otomatis — kamu tidak perlu setting apapun.",
		},
		{
			q: "Bagaimana jika proses gagal? Apakah kredit hangus?",
			a: "Tidak. Jika pemrosesan gagal karena error sistem, kredit yang sudah dipotong akan dikembalikan (refund) secara otomatis ke akunmu dan tercatat di riwayat transaksi.",
		},
		{
			q: "Metode pembayaran apa yang tersedia?",
			a: "Clipper menggunakan Duitku sebagai payment gateway. Tersedia Virtual Account (semua bank besar), e-wallet (GoPay, OVO, DANA, ShopeePay, LinkAja), kartu kredit, serta retail outlet (Alfamart & Indomaret).",
		},
		{
			q: "Bisa upgrade atau ganti plan di tengah bulan?",
			a: "Bisa! Kamu bisa upgrade tier (Free → Pro → Business) atau ganti opsi kredit dalam tier yang sama (misal Pro 20 → Pro 40). Perubahan berlaku di siklus billing berikutnya.",
		},
	];

	const steps = [
		{
			num: "01",
			icon: "☁️",
			title: "Upload Video",
			desc: "Upload video hingga 2GB dengan teknologi resumable upload. Koneksi putus? Auto-lanjut dari titik terakhir.",
		},
		{
			num: "02",
			icon: "🎙️",
			title: "Transkripsi Audio",
			desc: "ElevenLabs Scribe v2 transkripsi audiomu dengan akurasi tinggi, lengkap dengan timestamp per kata.",
		},
		{
			num: "03",
			icon: "🤖",
			title: "AI Deteksi Momen",
			desc: "Claude Sonnet AI menganalisis transkrip dan menemukan hot take, momen emosional, dan insight terbaik.",
		},
		{
			num: "04",
			icon: "✂️",
			title: "Render + Subtitle",
			desc: "ffmpeg memotong clip tepat pada timestamp, lalu subtitle dibakar otomatis dengan style clean & readable.",
		},
		{
			num: "05",
			icon: "⬇️",
			title: "Download & Upload",
			desc: "Clip siap didownload dalam format MP4. Preview langsung di browser sebelum kamu posting.",
		},
	];

	const features = [
		{
			icon: "🔄",
			title: "Resumable Upload",
			desc: "Teknologi tus protocol memastikan upload video besar hingga 2GB tetap aman meski koneksi tidak stabil.",
		},
		{
			icon: "📊",
			title: "Real-time Progress",
			desc: "Pantau setiap tahap pemrosesan secara live — dari audio extraction, transcription, hingga render clip.",
		},
		{
			icon: "🌏",
			title: "Multi-bahasa",
			desc: "Bahasa Indonesia, Inggris, dan bahasa lainnya dideteksi otomatis. ElevenLabs Scribe v2 mendukung 99+ bahasa.",
		},
		{
			icon: "💬",
			title: "Subtitle Otomatis",
			desc: "Word-level timestamps dikonversi jadi subtitle bersih — teks putih dengan outline hitam, terbaca di layar apapun.",
		},
		{
			icon: "⭐",
			title: "Viral Score AI",
			desc: "Setiap clip diberi viral score 1–10 oleh AI berdasarkan potensi shareability. Ambil yang terbaik dulu.",
		},
		{
			icon: "🔁",
			title: "Auto Refund Kredit",
			desc: "Jika pemrosesan gagal karena error sistem, kredit kamu dikembalikan otomatis. Tidak ada yang terbuang.",
		},
		{
			icon: "🔒",
			title: "Konten Aman & Private",
			desc: "File otomatis dihapus setelah 24 jam. Data kamu tidak disimpan permanen di server kami.",
		},
		{
			icon: "💳",
			title: "Pembayaran Lokal",
			desc: "GoPay, OVO, DANA, ShopeePay, Transfer Bank, Alfamart, Indomaret — semua via Duitku Payment Gateway.",
		},
		{
			icon: "📱",
			title: "Mobile Friendly",
			desc: "Interface responsif yang nyaman dipakai dari HP. Upload, cek progress, dan download langsung dari genggaman.",
		},
	];

	return (
		<>
			{/* Google Fonts */}
			<style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Sans:ital,wght@0,300;0,400;0,500;1,300&display=swap');

        * { box-sizing: border-box; margin: 0; padding: 0; }

        :root {
          --bg: #080810;
          --bg2: #0e0e1a;
          --surface: #13131f;
          --border: rgba(255,255,255,0.07);
          --accent: #7c5cfc;
          --accent2: #fc5cf8;
          --accent3: #5cf8c8;
          --text: #f0eeff;
          --muted: #7a7895;
          --card: #10101c;
        }

        body {
          background: var(--bg);
          color: var(--text);
          font-family: 'DM Sans', sans-serif;
        }

        .syne { font-family: 'Syne', sans-serif; }

        .grad-text {
          background: linear-gradient(135deg, var(--accent) 0%, var(--accent2) 50%, var(--accent3) 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .grad-text-2 {
          background: linear-gradient(90deg, var(--accent), var(--accent2));
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0.4; }
        }

        @keyframes marquee {
          from { transform: translateX(0); }
          to   { transform: translateX(-50%); }
        }

        .animate-fade-up-1 { animation: fadeUp 0.6s 0.0s ease both; }
        .animate-fade-up-2 { animation: fadeUp 0.6s 0.1s ease both; }
        .animate-fade-up-3 { animation: fadeUp 0.6s 0.2s ease both; }
        .animate-fade-up-4 { animation: fadeUp 0.6s 0.3s ease both; }
        .animate-fade-up-5 { animation: fadeUp 0.6s 0.4s ease both; }

        .badge-dot { animation: pulse 2s infinite; }

        .marquee-track { display: flex; gap: 48px; animation: marquee 20s linear infinite; white-space: nowrap; }

        .step-card { transition: background 0.2s; }
        .step-card:hover { background: var(--surface) !important; }

        .feature-card { transition: border-color 0.25s, transform 0.25s; }
        .feature-card:hover { border-color: rgba(124,92,252,0.4) !important; transform: translateY(-3px); }

        .plan-card { transition: transform 0.25s, border-color 0.25s; }
        .plan-card:hover { transform: translateY(-4px); }

        .faq-answer { overflow: hidden; transition: max-height 0.3s ease, opacity 0.3s ease; }

        input[type=range] { -webkit-appearance: none; width: 100%; height: 4px; border-radius: 2px; background: rgba(255,255,255,0.1); outline: none; cursor: pointer; }
        input[type=range]::-webkit-slider-thumb { -webkit-appearance: none; width: 18px; height: 18px; border-radius: 50%; background: var(--accent); cursor: pointer; }

        .btn-primary {
          display: inline-flex; align-items: center; gap: 8px;
          background: linear-gradient(135deg, var(--accent), var(--accent2));
          color: #fff; border: none; border-radius: 10px;
          padding: 14px 28px; font-size: 1rem; font-weight: 600;
          cursor: pointer; font-family: 'DM Sans', sans-serif;
          text-decoration: none;
          box-shadow: 0 0 40px rgba(124,92,252,0.3);
          transition: transform 0.2s, box-shadow 0.2s;
        }
        .btn-primary:hover { transform: translateY(-2px); box-shadow: 0 0 60px rgba(124,92,252,0.45); }

        .btn-ghost {
          display: inline-flex; align-items: center; gap: 8px;
          background: transparent; border: 1px solid rgba(255,255,255,0.1);
          color: var(--text); border-radius: 10px;
          padding: 14px 28px; font-size: 1rem; font-weight: 500;
          cursor: pointer; font-family: 'DM Sans', sans-serif;
          text-decoration: none;
          transition: border-color 0.2s, background 0.2s;
        }
        .btn-ghost:hover { border-color: rgba(255,255,255,0.25); background: rgba(255,255,255,0.04); }

        .nav-link { color: var(--muted); text-decoration: none; font-size: 0.9rem; font-weight: 500; transition: color 0.2s; }
        .nav-link:hover { color: var(--text); }

        .plan-btn-outline {
          display: block; width: 100%; text-align: center;
          padding: 13px; border-radius: 10px; font-weight: 600; font-size: 0.92rem;
          cursor: pointer; font-family: 'DM Sans', sans-serif; text-decoration: none;
          border: 1px solid rgba(255,255,255,0.1); color: var(--text); background: transparent;
          transition: border-color 0.2s, color 0.2s; margin-top: 24px;
        }
        .plan-btn-outline:hover { border-color: var(--accent); color: var(--accent); }

        .plan-btn-fill {
          display: block; width: 100%; text-align: center;
          padding: 13px; border-radius: 10px; font-weight: 600; font-size: 0.92rem;
          cursor: pointer; font-family: 'DM Sans', sans-serif; text-decoration: none;
          background: linear-gradient(90deg, var(--accent), var(--accent2));
          color: #fff; border: none;
          box-shadow: 0 0 30px rgba(124,92,252,0.3);
          transition: opacity 0.2s; margin-top: 24px;
        }
        .plan-btn-fill:hover { opacity: 0.88; }

        @media (max-width: 768px) {
          .hide-mobile { display: none !important; }
          .nav-pad { padding: 16px 20px !important; }
          .hero-pad { padding: 120px 20px 60px !important; }
          .section-pad { padding: 60px 20px !important; }
          .grid-1-col { grid-template-columns: 1fr !important; }
          .calc-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>

			<div
				style={{
					minHeight: "100vh",
					background: "var(--bg)",
					color: "var(--text)",
				}}
			>
				{/* ── NAV ── */}
				<nav
					style={{
						position: "fixed",
						top: 0,
						left: 0,
						right: 0,
						zIndex: 100,
						display: "flex",
						alignItems: "center",
						justifyContent: "space-between",
						padding: "18px 48px",
						background: "rgba(8,8,16,0.75)",
						backdropFilter: "blur(20px)",
						borderBottom: "1px solid var(--border)",
					}}
					className="nav-pad"
				>
					<span
						className="syne"
						style={{
							fontWeight: 800,
							fontSize: "1.4rem",
							letterSpacing: "-0.03em",
						}}
					>
						<span className="grad-text-2">Clipper</span>
					</span>
					<ul
						className="hide-mobile"
						style={{ display: "flex", gap: 32, listStyle: "none" }}
					>
						{["Cara Kerja", "Fitur", "Harga", "FAQ"].map((label, i) => (
							<li key={i}>
								<a
									href={`#${["cara-kerja", "fitur", "harga", "faq"][i]}`}
									className="nav-link"
								>
									{label}
								</a>
							</li>
						))}
					</ul>
					{/* Ganti href ke route register setelah Person C buat auth */}
					<Link
						to="/register"
						className="btn-primary"
						style={{ padding: "10px 22px", fontSize: "0.88rem" }}
					>
						Coba Gratis →
					</Link>
				</nav>

				{/* ── HERO ── */}
				<section
					id="hero"
					className="hero-pad"
					style={{
						minHeight: "100vh",
						display: "flex",
						flexDirection: "column",
						alignItems: "center",
						justifyContent: "center",
						textAlign: "center",
						padding: "120px 24px 80px",
						position: "relative",
						overflow: "hidden",
					}}
				>
					{/* Glow blobs */}
					<div
						style={{
							position: "absolute",
							width: 600,
							height: 600,
							borderRadius: "50%",
							background: "var(--accent)",
							filter: "blur(120px)",
							opacity: 0.15,
							top: -150,
							left: -100,
							pointerEvents: "none",
						}}
					/>
					<div
						style={{
							position: "absolute",
							width: 500,
							height: 500,
							borderRadius: "50%",
							background: "var(--accent2)",
							filter: "blur(120px)",
							opacity: 0.13,
							bottom: -100,
							right: -80,
							pointerEvents: "none",
						}}
					/>

					{/* Badge */}
					<div
						className="animate-fade-up-1"
						style={{
							display: "inline-flex",
							alignItems: "center",
							gap: 8,
							background: "rgba(124,92,252,0.12)",
							border: "1px solid rgba(124,92,252,0.3)",
							borderRadius: 100,
							padding: "6px 16px",
							fontSize: "0.8rem",
							fontWeight: 500,
							color: "#a990ff",
							marginBottom: 28,
						}}
					>
						<span
							className="badge-dot"
							style={{
								width: 6,
								height: 6,
								background: "var(--accent3)",
								borderRadius: "50%",
								display: "inline-block",
							}}
						/>
						Powered by Claude Sonnet & ElevenLabs Scribe v2
					</div>

					{/* Headline */}
					<h1
						className="syne animate-fade-up-2"
						style={{
							fontSize: "clamp(2.8rem, 7vw, 5.2rem)",
							fontWeight: 800,
							lineHeight: 1.05,
							letterSpacing: "-0.04em",
							maxWidth: 820,
						}}
					>
						Upload sekali,
						<br />
						dapat <span className="grad-text">viral clips</span>
						<br />
						otomatis.
					</h1>

					<p
						className="animate-fade-up-3"
						style={{
							marginTop: 24,
							fontSize: "clamp(1rem, 2vw, 1.15rem)",
							color: "var(--muted)",
							maxWidth: 540,
							fontWeight: 300,
						}}
					>
						AI kami menganalisis video panjangmu, menemukan 3–5 momen terbaik,
						memotongnya, dan membakar subtitle — siap upload ke TikTok, Reels &
						Shorts.
					</p>

					{/* Actions */}
					<div
						className="animate-fade-up-4"
						style={{
							display: "flex",
							gap: 14,
							marginTop: 44,
							flexWrap: "wrap",
							justifyContent: "center",
						}}
					>
						<Link to="/register" className="btn-primary">
							🎬 Mulai Gratis
						</Link>
						<a href="#cara-kerja" className="btn-ghost">
							Lihat cara kerja ↓
						</a>
					</div>

					{/* Stats */}
					<div
						className="animate-fade-up-5"
						style={{
							display: "flex",
							gap: 48,
							marginTop: 72,
							borderTop: "1px solid var(--border)",
							paddingTop: 40,
							flexWrap: "wrap",
							justifyContent: "center",
						}}
					>
						{[
							{ num: "~2 mnt", label: "Waktu proses video 10 mnt" },
							{ num: "3–5", label: "Clip viral per video" },
							{ num: "Rp1rb", label: "Per kredit (Plan Pro)" },
							{ num: "Auto", label: "Subtitle terbakar di clip" },
						].map((s, i) => (
							<div key={i} style={{ textAlign: "center" }}>
								<div
									className="syne grad-text-2"
									style={{ fontSize: "2rem", fontWeight: 800 }}
								>
									{s.num}
								</div>
								<div
									style={{
										fontSize: "0.82rem",
										color: "var(--muted)",
										marginTop: 4,
									}}
								>
									{s.label}
								</div>
							</div>
						))}
					</div>
				</section>

				{/* ── MARQUEE ── */}
				<div
					style={{
						overflow: "hidden",
						borderTop: "1px solid var(--border)",
						borderBottom: "1px solid var(--border)",
						padding: "20px 0",
					}}
				>
					<div className="marquee-track">
						{[
							"TikTok",
							"Instagram Reels",
							"YouTube Shorts",
							"Podcast Clips",
							"Webinar Highlights",
							"Interview Moments",
							"TikTok",
							"Instagram Reels",
							"YouTube Shorts",
							"Podcast Clips",
							"Webinar Highlights",
							"Interview Moments",
						].map((item, i) => (
							<span
								key={i}
								style={{
									fontSize: "0.8rem",
									fontWeight: 600,
									letterSpacing: "0.1em",
									color: "var(--muted)",
									textTransform: "uppercase",
								}}
							>
								{item} <span style={{ color: "var(--accent)" }}>●</span>
							</span>
						))}
					</div>
				</div>

				{/* ── HOW IT WORKS ── */}
				<section
					id="cara-kerja"
					className="section-pad"
					style={{ padding: "100px 24px", maxWidth: 1100, margin: "0 auto" }}
				>
					<p
						style={{
							fontSize: "0.75rem",
							fontWeight: 600,
							letterSpacing: "0.12em",
							textTransform: "uppercase",
							color: "var(--accent)",
							marginBottom: 16,
						}}
					>
						Pipeline
					</p>
					<h2
						className="syne"
						style={{
							fontSize: "clamp(1.8rem, 4vw, 2.8rem)",
							fontWeight: 800,
							letterSpacing: "-0.03em",
							lineHeight: 1.15,
						}}
					>
						Dari upload ke
						<br />
						viral clip dalam menit.
					</h2>
					<p style={{ color: "var(--muted)", marginTop: 14, fontWeight: 300 }}>
						Semua langkah otomatis. Kamu tinggal tunggu dan download.
					</p>

					<div
						className="grid-1-col"
						style={{
							display: "grid",
							gridTemplateColumns: "repeat(5, 1fr)",
							gap: 1,
							background: "var(--border)",
							border: "1px solid var(--border)",
							borderRadius: 16,
							overflow: "hidden",
							marginTop: 56,
						}}
					>
						{steps.map((step, i) => (
							<div
								key={i}
								className="step-card"
								style={{ background: "var(--card)", padding: "36px 24px" }}
							>
								<div
									style={{
										fontSize: "0.7rem",
										fontWeight: 700,
										letterSpacing: "0.1em",
										color: "var(--accent)",
										marginBottom: 16,
									}}
								>
									{step.num}
								</div>
								<div style={{ fontSize: "1.4rem", marginBottom: 16 }}>
									{step.icon}
								</div>
								<div
									className="syne"
									style={{ fontWeight: 700, fontSize: "1rem", marginBottom: 8 }}
								>
									{step.title}
								</div>
								<div
									style={{
										fontSize: "0.85rem",
										color: "var(--muted)",
										lineHeight: 1.6,
									}}
								>
									{step.desc}
								</div>
							</div>
						))}
					</div>
				</section>

				{/* ── FEATURES ── */}
				<section
					id="fitur"
					className="section-pad"
					style={{ padding: "100px 24px", maxWidth: 1100, margin: "0 auto" }}
				>
					<p
						style={{
							fontSize: "0.75rem",
							fontWeight: 600,
							letterSpacing: "0.12em",
							textTransform: "uppercase",
							color: "var(--accent)",
							marginBottom: 16,
						}}
					>
						Fitur
					</p>
					<h2
						className="syne"
						style={{
							fontSize: "clamp(1.8rem, 4vw, 2.8rem)",
							fontWeight: 800,
							letterSpacing: "-0.03em",
							lineHeight: 1.15,
						}}
					>
						Semua yang kamu
						<br />
						butuhkan, tanpa ribet.
					</h2>

					<div
						style={{
							display: "grid",
							gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
							gap: 18,
							marginTop: 56,
						}}
					>
						{features.map((f, i) => (
							<div
								key={i}
								className="feature-card"
								style={{
									background: "var(--card)",
									border: "1px solid var(--border)",
									borderRadius: 16,
									padding: "28px",
									position: "relative",
									overflow: "hidden",
								}}
							>
								<div
									style={{
										position: "absolute",
										inset: 0,
										background:
											"radial-gradient(circle at 0% 0%, rgba(124,92,252,0.06) 0%, transparent 60%)",
									}}
								/>
								<div style={{ fontSize: "1.7rem", marginBottom: 14 }}>
									{f.icon}
								</div>
								<div
									className="syne"
									style={{ fontWeight: 700, fontSize: "1rem", marginBottom: 8 }}
								>
									{f.title}
								</div>
								<div
									style={{
										fontSize: "0.86rem",
										color: "var(--muted)",
										lineHeight: 1.65,
									}}
								>
									{f.desc}
								</div>
							</div>
						))}
					</div>
				</section>

				{/* ── PRICING ── */}
				<section
					id="harga"
					className="section-pad"
					style={{ padding: "100px 24px", maxWidth: 1100, margin: "0 auto" }}
				>
					<p
						style={{
							fontSize: "0.75rem",
							fontWeight: 600,
							letterSpacing: "0.12em",
							textTransform: "uppercase",
							color: "var(--accent)",
							marginBottom: 16,
						}}
					>
						Harga
					</p>
					<h2
						className="syne"
						style={{
							fontSize: "clamp(1.8rem, 4vw, 2.8rem)",
							fontWeight: 800,
							letterSpacing: "-0.03em",
							lineHeight: 1.15,
						}}
					>
						Bayar sesuai
						<br />
						kebutuhanmu.
					</h2>
					<p style={{ color: "var(--muted)", marginTop: 14, fontWeight: 300 }}>
						Mulai gratis, upgrade kapan saja. Tidak ada kontrak jangka panjang.
					</p>

					<div
						style={{
							display: "grid",
							gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
							gap: 20,
							marginTop: 56,
						}}
					>
						{/* FREE */}
						<div
							className="plan-card"
							style={{
								background: "var(--card)",
								border: "1px solid var(--border)",
								borderRadius: 20,
								padding: 36,
							}}
						>
							<div
								className="syne"
								style={{
									fontWeight: 700,
									fontSize: "0.85rem",
									color: "var(--muted)",
									textTransform: "uppercase",
									letterSpacing: "0.08em",
									marginBottom: 12,
								}}
							>
								Free
							</div>
							<div
								className="syne"
								style={{
									fontWeight: 800,
									fontSize: "2.4rem",
									letterSpacing: "-0.03em",
								}}
							>
								Rp0{" "}
								<span
									style={{
										fontSize: "1rem",
										fontWeight: 400,
										color: "var(--muted)",
										fontFamily: "DM Sans, sans-serif",
									}}
								>
									/ bulan
								</span>
							</div>
							<div
								style={{
									fontSize: "0.82rem",
									color: "var(--muted)",
									marginTop: 4,
								}}
							>
								5 kredit sekali saat daftar
							</div>
							<hr
								style={{
									border: "none",
									borderTop: "1px solid var(--border)",
									margin: "24px 0",
								}}
							/>
							<ul
								style={{
									listStyle: "none",
									display: "flex",
									flexDirection: "column",
									gap: 10,
								}}
							>
								{[
									{ text: "5 kredit signup (sekali)", ok: true },
									{ text: "Video max 10 menit", ok: true },
									{ text: "File max 100 MB", ok: true },
									{ text: "Max 3 clips per video", ok: true },
									{ text: "Priority queue", ok: false },
									{ text: "Custom subtitle style", ok: false },
								].map((item, i) => (
									<li
										key={i}
										style={{
											fontSize: "0.87rem",
											display: "flex",
											alignItems: "center",
											gap: 10,
											color: item.ok ? "var(--text)" : "var(--muted)",
										}}
									>
										<span
											style={{
												color: item.ok ? "var(--accent3)" : "var(--muted)",
												fontWeight: 700,
												flexShrink: 0,
											}}
										>
											{item.ok ? "✓" : "✗"}
										</span>
										{item.text}
									</li>
								))}
							</ul>
							<Link to="/register" className="plan-btn-outline">
								Daftar Gratis
							</Link>
						</div>

						{/* PRO */}
						<div
							className="plan-card"
							style={{
								background:
									"linear-gradient(160deg, rgba(124,92,252,0.1), var(--card))",
								border: "1px solid var(--accent)",
								borderRadius: 20,
								padding: 36,
								position: "relative",
							}}
						>
							<div
								style={{
									position: "absolute",
									top: -12,
									left: "50%",
									transform: "translateX(-50%)",
									background:
										"linear-gradient(90deg, var(--accent), var(--accent2))",
									color: "#fff",
									fontSize: "0.72rem",
									fontWeight: 700,
									padding: "4px 14px",
									borderRadius: 100,
									letterSpacing: "0.05em",
									whiteSpace: "nowrap",
								}}
							>
								✦ Paling Populer
							</div>
							<div
								className="syne"
								style={{
									fontWeight: 700,
									fontSize: "0.85rem",
									color: "var(--muted)",
									textTransform: "uppercase",
									letterSpacing: "0.08em",
									marginBottom: 12,
								}}
							>
								Pro
							</div>
							<div
								className="syne"
								style={{
									fontWeight: 800,
									fontSize: "2.4rem",
									letterSpacing: "-0.03em",
								}}
							>
								Rp20.000{" "}
								<span
									style={{
										fontSize: "1rem",
										fontWeight: 400,
										color: "var(--muted)",
										fontFamily: "DM Sans, sans-serif",
									}}
								>
									/ bulan
								</span>
							</div>
							<div
								style={{
									fontSize: "0.82rem",
									color: "var(--muted)",
									marginTop: 4,
								}}
							>
								20 kredit/bulan · atau 40 kredit seharga Rp40rb
							</div>
							<hr
								style={{
									border: "none",
									borderTop: "1px solid var(--border)",
									margin: "24px 0",
								}}
							/>
							<ul
								style={{
									listStyle: "none",
									display: "flex",
									flexDirection: "column",
									gap: 10,
								}}
							>
								{[
									{ text: "20–40 kredit / bulan", ok: true },
									{ text: "Video max 30 menit", ok: true },
									{ text: "File max 500 MB", ok: true },
									{ text: "Max 5 clips per video", ok: true },
									{ text: "Priority queue ⚡", ok: true },
									{ text: "Custom subtitle style", ok: false },
								].map((item, i) => (
									<li
										key={i}
										style={{
											fontSize: "0.87rem",
											display: "flex",
											alignItems: "center",
											gap: 10,
											color: item.ok ? "var(--text)" : "var(--muted)",
										}}
									>
										<span
											style={{
												color: item.ok ? "var(--accent3)" : "var(--muted)",
												fontWeight: 700,
												flexShrink: 0,
											}}
										>
											{item.ok ? "✓" : "✗"}
										</span>
										{item.text}
									</li>
								))}
							</ul>
							<Link to="/register" className="plan-btn-fill">
								Mulai Pro →
							</Link>
						</div>

						{/* BUSINESS */}
						<div
							className="plan-card"
							style={{
								background: "var(--card)",
								border: "1px solid var(--border)",
								borderRadius: 20,
								padding: 36,
							}}
						>
							<div
								className="syne"
								style={{
									fontWeight: 700,
									fontSize: "0.85rem",
									color: "var(--muted)",
									textTransform: "uppercase",
									letterSpacing: "0.08em",
									marginBottom: 12,
								}}
							>
								Business
							</div>
							<div
								className="syne"
								style={{
									fontWeight: 800,
									fontSize: "2.4rem",
									letterSpacing: "-0.03em",
								}}
							>
								Rp40.000{" "}
								<span
									style={{
										fontSize: "1rem",
										fontWeight: 400,
										color: "var(--muted)",
										fontFamily: "DM Sans, sans-serif",
									}}
								>
									/ bulan
								</span>
							</div>
							<div
								style={{
									fontSize: "0.82rem",
									color: "var(--muted)",
									marginTop: 4,
								}}
							>
								20 kredit/bulan · atau 40 kredit seharga Rp80rb
							</div>
							<hr
								style={{
									border: "none",
									borderTop: "1px solid var(--border)",
									margin: "24px 0",
								}}
							/>
							<ul
								style={{
									listStyle: "none",
									display: "flex",
									flexDirection: "column",
									gap: 10,
								}}
							>
								{[
									{ text: "20–40 kredit / bulan", ok: true },
									{ text: "Video max 60 menit", ok: true },
									{ text: "File max 2 GB", ok: true },
									{ text: "Max 10 clips per video", ok: true },
									{ text: "Priority queue ⚡", ok: true },
									{ text: "Custom subtitle style ✨", ok: true },
								].map((item, i) => (
									<li
										key={i}
										style={{
											fontSize: "0.87rem",
											display: "flex",
											alignItems: "center",
											gap: 10,
											color: "var(--text)",
										}}
									>
										<span
											style={{
												color: "var(--accent3)",
												fontWeight: 700,
												flexShrink: 0,
											}}
										>
											✓
										</span>
										{item.text}
									</li>
								))}
							</ul>
							<Link to="/register" className="plan-btn-outline">
								Pilih Business
							</Link>
						</div>
					</div>

					{/* ── CREDIT CALCULATOR ── */}
					<div
						className="calc-grid"
						style={{
							background: "var(--card)",
							border: "1px solid var(--border)",
							borderRadius: 20,
							padding: 48,
							marginTop: 48,
							display: "grid",
							gridTemplateColumns: "1fr 1fr",
							gap: 48,
							alignItems: "center",
						}}
					>
						<div>
							<p
								style={{
									fontSize: "0.75rem",
									fontWeight: 600,
									letterSpacing: "0.12em",
									textTransform: "uppercase",
									color: "var(--accent)",
									marginBottom: 12,
								}}
							>
								Kalkulator Kredit
							</p>
							<h3
								className="syne"
								style={{
									fontSize: "1.4rem",
									fontWeight: 800,
									letterSpacing: "-0.02em",
									marginBottom: 12,
								}}
							>
								Berapa kredit yang kamu butuhkan?
							</h3>
							<p
								style={{
									color: "var(--muted)",
									fontSize: "0.87rem",
									marginBottom: 28,
								}}
							>
								Geser slider untuk estimasi kebutuhan bulananmu.
							</p>

							<label
								style={{
									fontSize: "0.85rem",
									color: "var(--muted)",
									display: "block",
									marginBottom: 10,
								}}
							>
								Jumlah video per bulan:{" "}
								<strong style={{ color: "var(--text)" }}>
									{vidCount} video
								</strong>
							</label>
							<input
								type="range"
								min={1}
								max={30}
								value={vidCount}
								onChange={(e) => setVidCount(+e.target.value)}
							/>

							<label
								style={{
									fontSize: "0.85rem",
									color: "var(--muted)",
									display: "block",
									marginBottom: 10,
									marginTop: 24,
								}}
							>
								Rata-rata durasi video:{" "}
								<strong style={{ color: "var(--text)" }}>
									{durLabelMap[durLevel]}
								</strong>
							</label>
							<input
								type="range"
								min={1}
								max={3}
								value={durLevel}
								onChange={(e) => setDurLevel(+e.target.value)}
							/>
						</div>

						<div
							style={{
								background: "var(--surface)",
								borderRadius: 12,
								padding: 24,
							}}
						>
							{[
								{ label: "Video per bulan", val: vidCount },
								{ label: "Kredit per video", val: creditPerVideo },
								{ label: "Total kredit", val: totalCredits },
								{
									label: "Rekomendasi plan",
									val: recommendedPlan(),
									highlight: true,
								},
							].map((row, i) => (
								<div
									key={i}
									style={{
										display: "flex",
										justifyContent: "space-between",
										alignItems: "center",
										padding: "12px 0",
										borderBottom: i < 3 ? "1px solid var(--border)" : "none",
									}}
								>
									<span style={{ color: "var(--muted)", fontSize: "0.88rem" }}>
										{row.label}
									</span>
									<span
										className="syne"
										style={{
											fontWeight: 700,
											color: row.highlight ? "var(--accent)" : "var(--text)",
										}}
									>
										{row.val}
									</span>
								</div>
							))}
						</div>
					</div>
				</section>

				{/* ── FAQ ── */}
				<section
					id="faq"
					className="section-pad"
					style={{ padding: "100px 24px", maxWidth: 1100, margin: "0 auto" }}
				>
					<p
						style={{
							fontSize: "0.75rem",
							fontWeight: 600,
							letterSpacing: "0.12em",
							textTransform: "uppercase",
							color: "var(--accent)",
							marginBottom: 16,
						}}
					>
						FAQ
					</p>
					<h2
						className="syne"
						style={{
							fontSize: "clamp(1.8rem, 4vw, 2.8rem)",
							fontWeight: 800,
							letterSpacing: "-0.03em",
						}}
					>
						Ada pertanyaan?
					</h2>

					<div
						style={{
							marginTop: 48,
							display: "flex",
							flexDirection: "column",
							gap: 12,
						}}
					>
						{faqs.map((faq, i) => (
							<div
								key={i}
								style={{
									background: "var(--card)",
									border: "1px solid var(--border)",
									borderRadius: 12,
									overflow: "hidden",
								}}
							>
								<button
									onClick={() => setOpenFaq(openFaq === i ? null : i)}
									style={{
										width: "100%",
										textAlign: "left",
										padding: "20px 24px",
										background: "none",
										border: "none",
										color: "var(--text)",
										fontFamily: "DM Sans, sans-serif",
										fontSize: "0.95rem",
										fontWeight: 500,
										cursor: "pointer",
										display: "flex",
										justifyContent: "space-between",
										alignItems: "center",
									}}
								>
									{faq.q}
									<span
										style={{
											color: "var(--accent)",
											fontSize: "1.2rem",
											transform: openFaq === i ? "rotate(45deg)" : "none",
											transition: "transform 0.3s",
											flexShrink: 0,
											marginLeft: 12,
										}}
									>
										+
									</span>
								</button>
								{openFaq === i && (
									<div
										style={{
											padding: "0 24px 20px",
											fontSize: "0.88rem",
											color: "var(--muted)",
											lineHeight: 1.7,
										}}
									>
										{faq.a}
									</div>
								)}
							</div>
						))}
					</div>
				</section>

				{/* ── CTA BANNER ── */}
				<div
					style={{ maxWidth: 1100, margin: "0 auto 100px", padding: "0 24px" }}
				>
					<div
						style={{
							background:
								"linear-gradient(135deg, rgba(124,92,252,0.15), rgba(252,92,248,0.1))",
							border: "1px solid rgba(124,92,252,0.3)",
							borderRadius: 24,
							padding: "72px 48px",
							textAlign: "center",
						}}
					>
						<h2
							className="syne"
							style={{
								fontSize: "clamp(1.8rem, 4vw, 2.8rem)",
								fontWeight: 800,
								letterSpacing: "-0.03em",
								marginBottom: 16,
							}}
						>
							Siap buat kontenmu
							<br />
							<span className="grad-text">viral hari ini?</span>
						</h2>
						<p
							style={{
								color: "var(--muted)",
								marginBottom: 36,
								fontWeight: 300,
							}}
						>
							Daftar gratis, dapat 5 kredit langsung. Tidak perlu kartu kredit.
						</p>
						<Link
							to="/register"
							className="btn-primary"
							style={{ fontSize: "1.05rem", padding: "16px 36px" }}
						>
							🎬 Mulai Sekarang — Gratis
						</Link>
					</div>
				</div>

				{/* ── FOOTER ── */}
				<footer
					style={{
						borderTop: "1px solid var(--border)",
						padding: "40px 48px",
						display: "flex",
						justifyContent: "space-between",
						alignItems: "center",
						flexWrap: "wrap",
						gap: 16,
					}}
				>
					<span
						className="syne grad-text-2"
						style={{ fontWeight: 800, fontSize: "1.1rem" }}
					>
						Clipper
					</span>
					<ul style={{ display: "flex", gap: 24, listStyle: "none" }}>
						{["Privacy Policy", "Terms of Service", "Kontak"].map(
							(label, i) => (
								<li key={i}>
									<a
										href="#"
										className="nav-link"
										style={{ fontSize: "0.83rem" }}
									>
										{label}
									</a>
								</li>
							),
						)}
					</ul>
				</footer>
			</div>
		</>
	);
}
