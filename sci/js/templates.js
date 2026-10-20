// templates.js - Danh sách câu mẫu nghiệp đoàn cho khối "Phân Tích Bản Thân"
// Mỗi mẫu gồm: label (tóm tắt nghĩa tiếng Việt hiển thị trong dropdown) và text (câu tiếng Nhật điền vào textarea)

const SELF_ANALYSIS_TEMPLATES = {
  // 自己PR (Giới thiệu bản thân)
  tuPR: [
    {
      label: "Vui vẻ, tích cực, hòa đồng",
      text: "明るく前向きな性格で、誰とでもすぐに仲良くなれます。初めての環境でも早く適応できます。",
    },
    {
      label: "Chăm chỉ, chịu khó",
      text: "真面目で素直な性格です。指示された作業は責任を持って最後までやり遂げます。",
    },
    {
      label: "Ham học hỏi, tiếp thu nhanh",
      text: "知的好奇心が旺盛で、新しい技術や日本語の勉強にも意欲的に取り組んでいます。",
    },
    {
      label: "Kiên trì, kỷ luật",
      text: "忍耐力があり、どんな困難な作業でも投げ出さずに粘り強く頑張ることができます。",
    },
  ],

  // 長所 (Sở trường)
  soTruong: [
    {
      label: "Khéo tay, cẩn thận",
      text: "手先が器用で、細かな作業を正確かつ丁寧に行うことができます。",
    },
    {
      label: "Thể lực tốt, dẻo dai",
      text: "体力に自信があり、長時間の立ち作業や重い荷物の運搬でも疲れにくいです。",
    },
    {
      label: "Tập trung cao độ",
      text: "集中力が高く、同じ作業の繰り返しでもミスが少なく安定しています。",
    },
    {
      label: "Đúng giờ, kỷ luật",
      text: "時間やルールを厳格に守り、挨拶や報告・連絡・相談を怠りません。",
    },
  ],

  // 他人より優秀な所 (Điểm vượt trội hơn người khác)
  vuotTroi: [
    {
      label: "Làm việc nhóm tốt",
      text: "チームワークを大切にし、周囲と協力して作業を効率的に進められます。",
    },
    {
      label: "Chịu áp lực tốt",
      text: "プレッシャーに強く、繁忙期や残業が続く時でも常に冷静に作業できます。",
    },
    {
      label: "Học việc và thích ứng nhanh",
      text: "先輩の仕事を見て素早くコツを掴み、作業スピードを上げられます。",
    },
    {
      label: "Sức bền vượt trội",
      text: "毎日の運動で鍛えた体力と持久力があり、健康管理を徹底しています。",
    },
  ],

  // 短所 (Sở đoản - Các mẫu an toàn)
  soDoan: [
    {
      label: "Hơi hồi hộp trước đám đông",
      text: "大勢の人の前で話すときに少し緊張しやすいですが、落ち着いて話すよう意識しています。",
    },
    {
      label: "Hay lo xa, cẩn thận quá mức",
      text: "心配性なところがあり、作業の確認を何度もしてしまいますが、ミスを防ぐことにつながっています。",
    },
    {
      label: "Hơi ít nói khi mới gặp",
      text: "初対面の人に対して少し人見知りなところがありますが、慣れれば積極的にコミュニケーションが取れます。",
    },
    {
      label: "Nói hơi nhanh khi lo lắng",
      text: "緊張すると早口になる癖がありますが、普段から相手に分かりやすくゆっくり話すよう心がけています。",
    },
  ],
};
