#ifndef UTIL_H_
#define UTIL_H_

#include <sys/mman.h>

#include <experimental/optional>
#include <experimental/string_view>
#include <memory>
#include <string>
#include <sstream>

#include "macros.h"

class ScopedFD {
 public:
  static constexpr int kInvalidFd = -1;

  explicit ScopedFD(int fd = kInvalidFd);
  ~ScopedFD();
  ScopedFD(ScopedFD&& fd);
  ScopedFD& operator=(ScopedFD&& fd);

  int get() const;
  int release();
  operator bool() const { return fd_ != kInvalidFd; }
  void reset(int fd = kInvalidFd);

 private:
  int fd_;

  DISALLOW_COPY_AND_ASSIGN(ScopedFD);
};

class ScopedMmap {
 public:
  ScopedMmap(void* ptr = MAP_FAILED, size_t size = 0);
  ~ScopedMmap();

  operator bool() const { return ptr_ != MAP_FAILED; }
  void* get();
  const void* get() const;
  void reset(void* ptr = MAP_FAILED, size_t size = 0);

 private:
  void* ptr_;
  size_t size_;

  DISALLOW_COPY_AND_ASSIGN(ScopedMmap);
};

std::string StringPrintf(const char* format, ...);

bool WriteFileDescriptor(int fd, std::experimental::string_view str);

template <typename T>
std::experimental::optional<T> ParseString(std::experimental::string_view str) {
  T value;
  std::istringstream is{std::string(str)};
  if (!is || !(is >> value))
    return std::experimental::nullopt;
  return value;
}

template <>
std::experimental::optional<uint32_t> ParseString(
    std::experimental::string_view str);

template <typename T>
std::experimental::optional<T> ParseString(
    std::experimental::optional<std::experimental::string_view> str) {
  if (!str)
    return std::experimental::nullopt;
  return ParseString<T>(str.value());
}

template <typename T>
inline void ignore_result(T /* unused result */) {}

#endif  // UTIL_H_
