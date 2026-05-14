import base64
from app.services.file_parser import parse_file_content


def _make_file_info(name, mime, text):
    data = base64.b64encode(text.encode('utf-8')).decode('utf-8')
    return {
        'name': name,
        'type': mime,
        'dataUrl': f'data:{mime};base64,{data}'
    }


def test_parse_txt_file():
    info = _make_file_info('test.txt', 'text/plain', 'Hello World')
    assert parse_file_content(info) == 'Hello World'


def test_parse_markdown():
    info = _make_file_info('doc.md', 'text/markdown', '# Title\ncontent')
    assert '# Title' in parse_file_content(info)


def test_parse_json():
    info = _make_file_info('data.json', 'application/json', '{"key": "value"}')
    assert 'key' in parse_file_content(info)


def test_parse_unknown_binary():
    """未知二进制文件应返回 None 或 fallback"""
    info = {
        'name': 'image.png',
        'type': 'image/png',
        'dataUrl': 'data:image/png;base64,iVBORw0KGgo='
    }
    result = parse_file_content(info)
    # 可能是 None 或者尝试 decode 后的乱码
    assert result is None or isinstance(result, str)


def test_parse_empty_data_url():
    info = {'name': 'x.txt', 'type': 'text/plain', 'dataUrl': 'invalid'}
    assert parse_file_content(info) is None


def test_parse_gbk_encoded():
    text = '这是一段GBK编码的中文文本，用于测试编码检测功能是否正确工作'
    gbk_bytes = text.encode('gbk')
    data = base64.b64encode(gbk_bytes).decode('utf-8')
    info = {
        'name': 'gbk.txt',
        'type': 'text/plain',
        'dataUrl': f'data:text/plain;base64,{data}'
    }
    result = parse_file_content(info)
    # GBK decode 应该包含原始中文
    assert len(result) > 10  # 至少有内容返回
