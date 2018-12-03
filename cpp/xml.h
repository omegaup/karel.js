#include <cstring>
#include <experimental/optional>
#include <experimental/string_view>
#include <functional>
#include <memory>
#include <string>
#include <vector>

#include "macros.h"

namespace xml {

class Buffer {
 public:
  explicit Buffer(int fd);
  Buffer(Buffer&& other);
  ~Buffer();

  void Add(char c) {
    buffer_[size_++] = c;
    if (Full())
      Flush();
  }
  void Add(std::experimental::string_view str) {
    memcpy(buffer_.get() + size_, str.data(), str.size());
    size_ += str.size();
    if (Full())
      Flush();
  }
  void Flush();

 private:
  bool Full() const { return size_ > 4096; }
  int fd_;
  std::unique_ptr<char[]> buffer_;
  size_t size_ = 0;
  DISALLOW_COPY_AND_ASSIGN(Buffer);
};

class Writer {
 public:
  Writer(int fd);
  ~Writer();

  class Element {
   public:
    Element(Element&&);
    ~Element();

    Element CreateElement(
        std::experimental::string_view name,
        std::experimental::optional<std::experimental::string_view> content =
            std::experimental::nullopt);
    void AddAttribute(std::experimental::string_view name,
                      std::experimental::string_view value);

   private:
    friend class Writer;
    Element(
        Writer* writer,
        std::experimental::string_view name,
        std::experimental::optional<std::experimental::string_view> content);

    Writer* writer_ = nullptr;
    std::string name_;
    size_t depth_;
    bool open_ = true;
    std::experimental::optional<std::string> content_;
    DISALLOW_COPY_AND_ASSIGN(Element);
  };

  Element CreateElement(
      std::experimental::string_view name,
      std::experimental::optional<std::experimental::string_view> content =
          std::experimental::nullopt);

 private:
  friend class Element;

  size_t PushDepth();
  void PopDepth();

  Buffer buffer_;
  size_t depth_ = 0;

  DISALLOW_COPY_AND_ASSIGN(Writer);
};

class Reader {
 public:
  Reader();
  ~Reader();

  class Element {
   public:
    ~Element();
    Element(Element&&);

    std::experimental::string_view GetName();
    std::experimental::optional<std::experimental::string_view> GetAttribute(
        std::experimental::string_view name,
        bool required = false);

   private:
    friend class Reader;
    Element(const char* name, const char** attrs);

    const char* name_;
    const char** attrs_;

    DISALLOW_COPY_AND_ASSIGN(Element);
  };

  using ParseCallback = std::function<bool(Element element)>;
  bool Parse(int fd, ParseCallback callback);

 private:
  struct State {
    bool success = true;
    ParseCallback callback;
  };

  static void StartElementHandler(void* user_data,
                                  const char* name,
                                  const char** attrs);
  static void EndElementHandler(void* user_data, const char* name);

  DISALLOW_COPY_AND_ASSIGN(Reader);
};

}  // namespace xml
