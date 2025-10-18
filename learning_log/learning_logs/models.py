from django.db import models
from django.contrib.auth.models import User

# Create your models here.
# 创建名为Topic的类，它继承了Model，即django中定义了模型基本功能的类
class Topic(models.Model):
    """用户学习的主题"""

    #  CharField——由字符组成的数据，即文本。
    # 当需要存储少量文本（如名称、标题或城市）时，可使用CharField。
    # 在定义 CharField 属性时，必须告诉 Django 该在数据库中预留多少空间。
    # 这里将 max_length 设置成了 200（即200 个字符），这对于存储大多数主题名来说足够了
    text = models.CharField(max_length=200)

    #  DateTimeField——记录日期和时间的数据。
    # 传递实参 auto_now_add=True，每当用户创建新主题时，Django 都会将这个属性自动设置为当前的日期和时间。
    date_added = models.DateTimeField(auto_now_add=True)

    # 建立到模型 User 的外键关系。当用户被删除时，所有与之相关联的主题也会被删除。
    owner = models.ForeignKey(User, on_delete=models.CASCADE)

    # 如果模型有__str__() 方法，那么每当需要生成表示模型实例的输出时，Django 都将调用这个方法。
    # 这里编写了 __str__() 方法，它返回属性 text 的值
    def __str__(self):
        """返回模型的字符串表示"""
        return self.text

class Entry(models.Model):
    """学到的有关某个主题的具体知识"""
    # ForeignKey 实例。外键（foreign key）是一个数据库术语，它指向数据库中的另一条记录，这里则是将每个条目关联到特定的主题。
    # 在创建每个主题时，都为其分配一个键（ID）。当需要在两项数据之间建立联系时，Django 就会使用与每项信息相关联的键。
    # 实参 on_delete=models.CASCADE 让Django 在删除主题的同时删除所有与之相关联的条目，称为级联删除（cascading delete）。
    topic = models.ForeignKey(Topic, on_delete=models.CASCADE)
    text = models.TextField() # 文字长度不受限制
    date_added = models.DateTimeField(auto_now_add=True)

    # 在 Entry 类中嵌套了 Meta 类。Meta 存储用于管理模型的额外信息。
    # 设置一个特殊属性，让Django 在需要时使用 Entries 表示多个条目
    # 如果没有这个类，Django 将使用 Entrys 表示多个条目。
    class Meta:
        verbose_name_plural = 'entries'
    
    # __str__() 方法告诉 Django 在呈现条目时应显示哪些信息。
    def __str__(self):
        """返回一个表示条目的简单字符串"""
        return f"{self.text[:50]}..." # 只返回 text 的前50 个字符
