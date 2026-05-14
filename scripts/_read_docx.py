import docx

doc = docx.Document(r'C:\Users\xiaoy\Desktop\人工智能大作业报告.docx')
for i, p in enumerate(doc.paragraphs):
    print(f"[{i}] {repr(p.text)}")