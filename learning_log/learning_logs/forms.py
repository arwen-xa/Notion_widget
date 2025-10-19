from django import forms 
from .models import Topic, Entry

class TopicForm(forms.ModelForm): 
    # 最简单的 ModelForm 版本只包含一个内嵌的 Meta 类，
    # 告诉Django 根据哪个模型创建表单以及在表单中包含哪些字段。
    class Meta:
        # 这里指定根据模型 Topic 创建表单，并且其中只包含字段text。
        # 字典 labels 中的空字符串告诉 Django 不要为字段 text 生成标签
        model = Topic
        fields = ['text']
        labels = {'text': ''}

class EntryForm(forms.ModelForm):
    class Meta:
        model = Entry
        fields = ['text']
        labels = {'text': ''} # 给字段 text 指定了一个空白标签,否则会显示在输入框的前方
        # 小部件（widget）是一种 HTML 表单元素，如单行文本框、多行文本区域或下拉列表。
        # 通过设置属性 widgets，可覆盖 Django 选择的默认小部件。
        # 这里让 Django 使用宽度为 80 列（而不是默认的 40 列）的 forms.Textarea 元素。
        widgets = {'text': forms.Textarea(attrs={'cols':80})}